const { createEmbed } = require('../utils/embedFactory');
const { AudioPlayerStatus } = require('@discordjs/voice');
const config = require('../../config');
const {
    getQueue,
    createQueue,
    joinChannel,
    playSong,
    formatDuration,
    getVideoInfo,
    searchVideo
} = require('../utils/player');
const cookieManager = require('../utils/cookieManager');

/**
 * Cek apakah URL adalah Spotify link
 */
function isSpotifyUrl(url) {
    return /^https?:\/\/(open\.)?spotify\.com\/(track|album|playlist)\//.test(url);
}

/**
 * Validasi URL YouTube sederhana
 */
function isYouTubeUrl(url) {
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);
}

/**
 * Ambil info track Spotify dan cari di YouTube
 */
async function handleSpotify(url) {
    try {
        const { getData } = require('spotify-url-info')(require('undici').fetch);
        const data = await getData(url);

        if (!data) throw new Error('Tidak bisa mengambil data dari Spotify');

        let tracks = [];

        if (data.type === 'track') {
            const artist = data.artists?.map(a => a.name).join(', ') || 'Unknown';
            tracks.push({
                searchQuery: `${data.name} ${artist}`,
                spotifyTitle: `${data.name} - ${artist}`,
                spotifyThumbnail: data.coverArt?.sources?.[0]?.url || data.album?.images?.[0]?.url || null,
                duration: data.duration ? formatDuration(Math.floor(data.duration / 1000)) : 'Unknown',
            });
        } else if (data.type === 'album' || data.type === 'playlist') {
            const trackList = data.trackList || data.tracks?.items || [];
            // Limit playlist items to prevent spam/timeout
            const limit = 50;

            for (const item of trackList.slice(0, limit)) {
                const track = item.track || item;
                const artist = track.artists?.map(a => a.name).join(', ') || track.subtitle || 'Unknown';
                const name = track.name || track.title || 'Unknown';
                tracks.push({
                    searchQuery: `${name} ${artist}`,
                    spotifyTitle: `${name} - ${artist}`,
                    spotifyThumbnail: data.coverArt?.sources?.[0]?.url || null,
                    duration: track.duration ? formatDuration(Math.floor(track.duration / 1000)) : 'Unknown',
                });
            }
        }

        return tracks;
    } catch (error) {
        console.error('Spotify parse error:', error);
        throw new Error(`Gagal mengambil data Spotify: ${error.message}`);
    }
}

module.exports = {
    name: 'play',
    aliases: ['p'],
    description: 'Putar lagu dari YouTube/Spotify (URL atau search)',
    async execute(message, args) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply({ embeds: [createEmbed({ color: '#FF0000', description: '❌ Kamu harus join voice channel dulu!' })] });
        }

        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return message.reply({ embeds: [createEmbed({ color: '#FF0000', description: '❌ Bot tidak punya permission join/speak!' })] });
        }

        if (!args.length) {
            return message.reply({
                embeds: [
                    createEmbed({ color: '#FF0000', description: '❌ Masukkan URL atau judul lagu!' })
                ]
            });
        }

        const query = args.join(' ');

        try {
            const loadingMsg = await message.reply({
                embeds: [createEmbed({ description: '🔍 Mencari lagu...' })]
            });

            let songsToAdd = [];

            // 1. SPOTIFY
            if (isSpotifyUrl(query)) {
                await loadingMsg.edit({ embeds: [createEmbed({ color: '#1DB954', description: '🎧 Mengambil data Spotify...' })] });
                const spotifyTracks = await handleSpotify(query);

                if (!spotifyTracks.length) throw new Error('Track tidak ditemukan di Spotify');

                // TRACK 1: Cari langsung agar bisa segera diputar
                const firstTrack = spotifyTracks[0];
                const firstResult = await searchVideo(firstTrack.searchQuery);

                if (firstResult) {
                    songsToAdd.push({
                        title: firstTrack.spotifyTitle,
                        url: firstResult.webpage_url || firstResult.url,
                        duration: firstTrack.duration,
                        thumbnail: firstTrack.spotifyThumbnail || firstResult.thumbnail,
                        requestedBy: message.author.tag,
                        requestedById: message.author.id,
                        source: 'spotify',
                    });
                } else {
                    songsToAdd.push({
                        title: firstTrack.spotifyTitle,
                        searchQuery: firstTrack.searchQuery,
                        duration: firstTrack.duration,
                        thumbnail: firstTrack.spotifyThumbnail,
                        requestedBy: message.author.tag,
                        requestedById: message.author.id,
                        source: 'spotify',
                    });
                }

                // SISA TRACKS: Push sebagai "Unresolved" (Lazy Load)
                for (let i = 1; i < spotifyTracks.length; i++) {
                    const track = spotifyTracks[i];
                    songsToAdd.push({
                        title: track.spotifyTitle,
                        searchQuery: track.searchQuery, // Penting untuk resolve nanti
                        duration: track.duration,
                        thumbnail: track.spotifyThumbnail,
                        requestedBy: message.author.tag,
                        requestedById: message.author.id,
                        source: 'spotify',
                    });
                }

                const embed = createEmbed({
                    color: '#1DB954',
                    title: '🎧 Spotify Added',
                    description: `✅ **${spotifyTracks.length}** lagu ditambahkan ke queue.`,
                    footer: { text: '⚡ Lazy Loaded: Lagu akan dicari saat diputar.' }
                });
                await loadingMsg.edit({ embeds: [embed] });

                // 2. YOUTUBE URL (Video / Playlist)
            } else if (isYouTubeUrl(query)) {
                // Gunakan flat: true untuk playlist agar cepat
                const info = await getVideoInfo(query, { flat: true });

                if (info._type === 'playlist' || info.entries) {
                    // Playlist
                    const entries = info.entries || [];
                    const playlistTitle = info.title || 'YouTube Playlist';

                    for (const entry of entries) {
                        if (entry) {
                            songsToAdd.push({
                                title: entry.title,
                                url: entry.url || `https://www.youtube.com/watch?v=${entry.id}`,
                                duration: entry.duration ? formatDuration(entry.duration) : 'Unknown',
                                thumbnail: entry.thumbnail || null,
                                requestedBy: message.author.tag,
                                requestedById: message.author.id,
                                source: 'youtube',
                            });
                        }
                    }

                    await loadingMsg.edit({
                        embeds: [
                            createEmbed({
                                title: '📋 YouTube Playlist',
                                description: `✅ **${songsToAdd.length}** lagu dari **${playlistTitle}**`
                            })
                        ]
                    });

                } else {
                    // Single Video
                    const videoUrl = info.webpage_url || info.original_url || info.url || query;
                    songsToAdd.push({
                        title: info.title,
                        url: videoUrl,
                        duration: formatDuration(info.duration),
                        thumbnail: info.thumbnail,
                        requestedBy: message.author.tag,
                        requestedById: message.author.id,
                        source: 'youtube',
                    });
                    await loadingMsg.delete().catch(() => { });
                }

                // 3. SEARCH KEYWORD
            } else {
                const result = await searchVideo(query);
                if (!result) throw new Error('Pencarian tidak ditemukan.');

                songsToAdd.push({
                    title: result.title,
                    url: result.webpage_url || result.url,
                    duration: formatDuration(result.duration),
                    thumbnail: result.thumbnail,
                    requestedBy: message.author.tag,
                    requestedById: message.author.id,
                    source: 'youtube',
                });
                await loadingMsg.delete().catch(() => { });
            }

            // Add to Queue
            if (songsToAdd.length === 0) return;

            let queue = getQueue(message.guild.id);
            if (queue) {
                const wasEmpty = queue.songs.length === 0;
                queue.songs.push(...songsToAdd);

                if (songsToAdd.length === 1) {
                    message.channel.send({
                        embeds: [
                            createEmbed({
                                title: '✅ Added to Queue',
                                description: `**[${songsToAdd[0].title}](${songsToAdd[0].url})**`,
                                fields: [
                                    { name: '⏱️ Durasi', value: songsToAdd[0].duration, inline: true },
                                    { name: '📋 Posisi', value: `#${queue.songs.length}`, inline: true },
                                    { name: '👤 Requested by', value: songsToAdd[0].requestedBy, inline: true }
                                ],
                                thumbnail: songsToAdd[0].thumbnail
                            })
                        ]
                    }).catch(console.error);
                }

                // Cek status player: Jika IDLE atau lagu habis, mainkan lagu baru
                if (queue.player.state.status === AudioPlayerStatus.Idle || wasEmpty) {
                    console.log('▶️ Queue was idle/empty but existing, starting play...');
                    playSong(message.guild.id, queue.songs[0]);
                }
            } else {
                queue = createQueue(message.guild.id, message.channel, voiceChannel);
                queue.songs.push(...songsToAdd);
                try {
                    await joinChannel(queue, message.guild.id);
                    playSong(message.guild.id, queue.songs[0]);
                } catch (err) {
                    console.error('Join Error:', err);
                    queue.songs = [];
                    message.reply('❌ Gagal connect ke voice channel');
                }
            }

        } catch (error) {
            console.error('Play Cmd Error:', error);

            // Check cookie error
            if (error.message.includes('Sign in') || error.message.includes('bot')) {
                return message.reply({
                    embeds: [
                        createEmbed({ color: '#FF0000', title: '🤖 YT Blocked', description: 'Cookie perlu direload! `!reload-cookies`' })
                    ]
                });
            }

            return message.reply({
                embeds: [createEmbed({ color: '#FF0000', description: `❌ Error: ${error.message}` })]
            });
        }
    },
};
