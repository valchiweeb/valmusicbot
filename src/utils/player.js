const {
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    joinVoiceChannel,
    getVoiceConnection,
    VoiceConnectionStatus,
    entersState,
    StreamType,
} = require('@discordjs/voice');
const { spawn } = require('child_process');
const ytdlExec = require('youtube-dl-exec');
const { EmbedBuilder } = require('discord.js');
const config = require('../../config');
const cookieManager = require('./cookieManager');
const path = require('path');
const fs = require('fs');

// Queue per server (guild)
const queues = new Map();

// Resolve yt-dlp binary path dynamically
const ytDlpPath = (() => {
    try {
        // Coba resolve dari youtube-dl-exec package.json lokasi
        const packagePath = require.resolve('youtube-dl-exec/package.json');
        const updatedPath = path.join(path.dirname(packagePath), 'bin', 'yt-dlp.exe');
        if (fs.existsSync(updatedPath)) return updatedPath;

        // Fallback ke node_modules hardcoded
        const hardcodedPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');
        if (fs.existsSync(hardcodedPath)) return hardcodedPath;

        // Fallback global atau Linux path (bukan .exe)
        const linuxPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');
        if (fs.existsSync(linuxPath)) return linuxPath;

        console.error('❌ Could not find yt-dlp binary!');
        return 'yt-dlp'; // Harap ada di PATH global
    } catch (e) {
        console.error('Error resolving yt-dlp path:', e);
        return 'yt-dlp';
    }
})();

console.log('✅ using yt-dlp at:', ytDlpPath);


/**
 * Ambil atau buat queue untuk guild
 */
function getQueue(guildId) {
    return queues.get(guildId);
}

/**
 * Buat queue baru untuk guild
 */
function createQueue(guildId, textChannel, voiceChannel) {
    const queue = {
        textChannel,
        voiceChannel,
        connection: null,
        player: createAudioPlayer(),
        songs: [],
        volume: config.defaultVolume,
        playing: true,
        loop: false,
    };

    queues.set(guildId, queue);

    // Event handlers untuk player
    queue.player.on(AudioPlayerStatus.Idle, () => {
        if (queue.songs.length > 0) {
            queue.songs.shift();
            if (queue.songs.length > 0) {
                playSong(guildId, queue.songs[0]);
            } else {
                queue.textChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.embedColor)
                            .setDescription('🎵 Queue kosong. Gunakan `!play` untuk menambah lagu!')
                    ]
                }).catch(console.error);

                // Disconnect setelah 3 menit idle
                setTimeout(() => {
                    const currentQueue = getQueue(guildId);
                    if (currentQueue && currentQueue.songs.length === 0) {
                        destroyQueue(guildId);
                    }
                }, 3 * 60 * 1000);
            }
        }
    });

    queue.player.on('error', (error) => {
        console.error('❌ [Player Error]:', error.message);

        const isAuthError = error.message.includes('403') ||
            error.message.includes('Sign in') ||
            error.message.includes('bot') ||
            error.message.includes('playable');

        if (isAuthError) {
            queue.textChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Error: YouTube Blocked')
                        .setDescription(
                            'YouTube memblokir request.\n\n' +
                            '**Solusi:**\n' +
                            '1. Export ulang cookies dari browser\n' +
                            '2. Simpan sebagai `cookies.json`\n' +
                            '3. Gunakan command `!reload-cookies`'
                        )
                ]
            }).catch(console.error);
        } else {
            queue.textChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setDescription(`❌ Error saat memutar: ${error.message}`)
                ]
            }).catch(console.error);
        }

        // Skip ke lagu berikutnya
        if (queue.songs.length > 0) {
            queue.songs.shift();
            if (queue.songs.length > 0) {
                playSong(guildId, queue.songs[0]);
            }
        }
    });

    return queue;
}

/**
 * Join voice channel dan setup connection
 */
async function joinChannel(queue, guildId) {
    const connection = joinVoiceChannel({
        channelId: queue.voiceChannel.id,
        guildId: guildId,
        adapterCreator: queue.voiceChannel.guild.voiceAdapterCreator,
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
        } catch (error) {
            destroyQueue(guildId);
        }
    });

    queue.connection = connection;
    connection.subscribe(queue.player);

    return connection;
}

/**
 * Extract YouTube video ID
 */
function extractVideoId(url) {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

/**
 * Build cookie file path for yt-dlp
 */
function getCookieFilePath() {
    const cookiePath = path.join(process.cwd(), 'cookies.txt');
    // Convert cookies.json ke Netscape cookie format jika belum ada
    if (!fs.existsSync(cookiePath)) {
        convertCookiesToNetscape();
    }
    return fs.existsSync(cookiePath) ? cookiePath : null;
}

/**
 * Convert cookies.json ke format Netscape (untuk yt-dlp)
 */
function convertCookiesToNetscape() {
    try {
        const jsonPath = path.join(process.cwd(), 'cookies.json');
        if (!fs.existsSync(jsonPath)) return;

        const cookies = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        if (!Array.isArray(cookies)) return;

        let netscape = '# Netscape HTTP Cookie File\n';
        netscape += '# This file was generated automatically\n\n';

        for (const c of cookies) {
            const domain = c.domain || '';
            const flag = domain.startsWith('.') ? 'TRUE' : 'FALSE';
            const path = c.path || '/';
            const secure = c.secure ? 'TRUE' : 'FALSE';
            const expiry = c.expirationDate ? Math.floor(c.expirationDate) : 0;
            const name = c.name || '';
            const value = c.value || '';
            netscape += `${domain}\t${flag}\t${path}\t${secure}\t${expiry}\t${name}\t${value}\n`;
        }

        fs.writeFileSync(path.join(process.cwd(), 'cookies.txt'), netscape);
        console.log('✅ [Cookies] Converted cookies.json → cookies.txt (Netscape format)');
    } catch (err) {
        console.error('⚠️ [Cookies] Failed to convert cookies:', err.message);
    }
}

// Convert cookies on load
convertCookiesToNetscape();

/**
 * Mainkan lagu menggunakan yt-dlp + ffmpeg streaming
 */
async function playSong(guildId, song) {
    const queue = getQueue(guildId);
    if (!queue) return;

    try {
        // LAZY LOADING: Resolve URL jika belum ada
        if (!song.url && song.searchQuery) {
            console.log(`🔍 [Lazy Load] Resolving: ${song.searchQuery}`);
            try {
                const result = await searchVideo(song.searchQuery);
                if (result) {
                    song.url = result.webpage_url || result.url;
                    song.duration = formatDuration(result.duration);
                    song.thumbnail = result.thumbnail || song.thumbnail;
                } else {
                    throw new Error('Video tidak ditemukan.');
                }
            } catch (err) {
                console.error(`❌ Failed to resolve ${song.searchQuery}:`, err.message);
                queue.textChannel.send({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription(`❌ Gagal memutar **${song.title}**: Video tidak ditemukan.`)] }).catch(() => { });
                queue.songs.shift();
                if (queue.songs.length > 0) playSong(guildId, queue.songs[0]);
                return;
            }
        }

        // Normalize URL
        let streamUrl = song.url;
        const videoId = extractVideoId(streamUrl);
        if (videoId) {
            streamUrl = `https://www.youtube.com/watch?v=${videoId}`;
        }

        console.log(`🎵 [Stream] Streaming via yt-dlp: ${streamUrl}`);

        // Build yt-dlp arguments
        // Output ke stdout langsung dalam format opus atau raw webm audio
        // Build yt-dlp arguments
        // Output ke stdout langsung dalam format opus atau raw webm audio
        const ytdlpArgs = [
            streamUrl,
            '-f', 'bestaudio[ext=webm][acodec=opus][asr=48000]/bestaudio', // Prefer webm opus 48kHz (Stable)
            '-o', '-',           // output ke stdout
            '--no-playlist',
            '--no-warnings',
            '--quiet',
        ];

        // Add cookies
        const cookieFile = getCookieFilePath();
        if (cookieFile) {
            ytdlpArgs.push('--cookies', cookieFile);
            console.log('🍪 [Stream] Using cookies for yt-dlp');
        }

        // Spawn yt-dlp process
        const proc = spawn(ytDlpPath, ytdlpArgs, {
            stdio: ['ignore', 'pipe', 'pipe'], // stdin, stdout, stderr
        });

        // Log stderr for debugging
        let stderrData = '';
        proc.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        proc.on('error', (err) => {
            console.error('❌ [yt-dlp] Process error:', err.message);
            queue.textChannel.send({
                embeds: [new EmbedBuilder().setColor('#FF0000').setDescription(`Stream process error: ${err.message}`)]
            }).catch(() => { });
        });

        // Create audio resource directly from stdout pipe
        // Note: yt-dlp outputting webm/opus is usually handled fine by discord.js Arbitrary/WebmOpus input type
        // Use WebmOpus type to avoid FFmpeg transcoding overhead (CPU intensive)
        const resource = createAudioResource(proc.stdout, {
            inputType: StreamType.WebmOpus,
            inlineVolume: false, // Disabling volume control for performance stability (Fix speedup/stutter)
        });

        // Volume control is disabled for performance
        // resource.volume.setVolume(queue.volume / 100); 

        queue.player.play(resource);
        queue.playing = true;

        // Kirim embed "Now Playing" only once per song
        // (Bisa gunakan flag di song object atau cek msg history, tapi simple nya kirim aja)
        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle('🎶 Now Playing')
            .setDescription(`**[${song.title}](${streamUrl})**`)
            .addFields(
                { name: '⏱️ Durasi', value: song.duration || 'Unknown', inline: true },
                { name: '👤 Requested by', value: `${song.requestedBy}`, inline: true }
            )
            .setThumbnail(song.thumbnail || null)
            .setTimestamp();

        if (song.source === 'spotify') {
            embed.setFooter({ text: '🎧 Dari Spotify → YouTube | Streaming via yt-dlp' });
        } else {
            const cookieStatus = cookieManager.getStatus();
            if (cookieStatus.loaded) {
                embed.setFooter({ text: `🍪 Cookies: Active (${cookieStatus.count} cookies) | yt-dlp` });
            } else {
                embed.setFooter({ text: '⚠️ Cookies: Tidak aktif | yt-dlp' });
            }
        }

        queue.textChannel.send({ embeds: [embed] }).catch(console.error);

        // Cleanup on exit
        proc.on('close', (code) => {
            if (code !== 0 && stderrData) {
                // Ignore some common harmless warnings
                if (!stderrData.includes('DeprecationWarning')) {
                    console.error('❌ [yt-dlp] Exit code:', code, '| stderr:', stderrData.slice(0, 200));
                }
            }
        });

    } catch (error) {
        console.error('❌ [Play Error]:', error.message);

        queue.textChannel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#FF0000')
                    .setDescription(`❌ Gagal memutar **${song.title}**: ${error.message}`)
            ]
        }).catch(console.error);

        queue.songs.shift();
        if (queue.songs.length > 0) {
            playSong(guildId, queue.songs[0]);
        }
    }
}

/**
 * Destroy queue dan disconnect
 */
function destroyQueue(guildId) {
    const queue = getQueue(guildId);
    if (!queue) return;

    queue.songs = [];
    queue.player.stop();

    const connection = getVoiceConnection(guildId);
    if (connection) {
        connection.destroy();
    }

    queues.delete(guildId);
}

/**
 * Format durasi detik ke mm:ss
 */
function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get video info using yt-dlp
 */
async function getVideoInfo(url, options = {}) {
    try {
        const cookieFile = getCookieFilePath();
        const args = {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true,
            noCheckCertificate: true,
            preferFreeFormats: true,
            youtubeSkipDashManifest: true,
        };

        if (options.flat) {
            args.flatPlaylist = true;
        }

        if (cookieFile) args.cookies = cookieFile;

        const output = await ytdlExec(url, args);
        return output;
    } catch (e) {
        console.error('❌ [yt-dlp] Info Error:', e.message);
        throw new Error('Gagal mengambil info video. Pastikan link valid & tidak private.');
    }
}

/**
 * Search video using yt-dlp
 */
async function searchVideo(query) {
    try {
        const cookieFile = getCookieFilePath();
        const args = {
            dumpSingleJson: true,
            defaultSearch: 'ytsearch1',
            noWarnings: true,
            noCallHome: true,
            noCheckCertificate: true,
        };
        if (cookieFile) args.cookies = cookieFile;

        const output = await ytdlExec(query, args);

        // Handle search result structure (sometimes it's in .entries)
        if (output.entries && output.entries.length > 0) {
            return output.entries[0];
        }
        return output;
    } catch (e) {
        console.error('❌ [yt-dlp] Search Error:', e.message);
        return null;
    }
}

module.exports = {
    queues,
    getQueue,
    createQueue,
    joinChannel,
    playSong,
    destroyQueue,
    formatDuration,
    convertCookiesToNetscape,
    getVideoInfo,
    searchVideo,
};
