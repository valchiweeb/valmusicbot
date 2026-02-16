const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const cookieManager = require('./src/utils/cookieManager');

// ══════════════════════════════════════════════════════════
//  🎵 Discord Music Bot — dengan Cookie Anti-Robot Bypass
// ══════════════════════════════════════════════════════════

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// Collection untuk menyimpan commands
client.commands = new Collection();

// ─── Load Commands ───────────────────────────────────────
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.name, command);

    // Register aliases
    if (command.aliases && Array.isArray(command.aliases)) {
        command.aliases.forEach(alias => {
            client.commands.set(alias, command);
        });
    }
}

console.log(`📦 Loaded ${commandFiles.length} commands`);

// ─── Load Cookies ────────────────────────────────────────
console.log('\n🍪 ═══ Cookie Anti-Robot System ═══');
cookieManager.loadCookies();

// Add ffmpeg-static to PATH
const ffmpegPath = require('ffmpeg-static');
if (ffmpegPath) {
    const ffmpegDir = require('path').dirname(ffmpegPath);
    process.env.PATH = `${ffmpegDir}${require('path').delimiter}${process.env.PATH}`;
    console.log(`✅ [FFmpeg] Path configured: ${ffmpegDir}`);
}

// Convert cookies ke Netscape format untuk yt-dlp
const { convertCookiesToNetscape } = require('./src/utils/player');

// Auto-refresh cookies setiap interval
setInterval(() => {
    console.log('🔄 [Auto-Refresh] Checking cookies...');
    cookieManager.loadCookies();
    convertCookiesToNetscape();
}, config.cookieRefreshInterval);


// ─── Bot Ready ───────────────────────────────────────────
client.once('ready', () => {
    console.log('\n══════════════════════════════════════');
    console.log(`🤖 Bot logged in as: ${client.user.tag}`);
    console.log(`📡 Serving ${client.guilds.cache.size} server(s)`);
    console.log(`🎵 Prefix: ${config.prefix}`);
    console.log('══════════════════════════════════════\n');

    // Set activity
    client.user.setActivity(`${config.prefix}help | 🎵 Music`, { type: 2 }); // Type 2 = Listening
});

// ─── Message Handler ─────────────────────────────────────
client.on('messageCreate', async (message) => {
    // Ignore bot messages dan messages tanpa prefix
    if (message.author.bot) return;
    if (!message.content.startsWith(config.prefix)) return;

    // Parse command dan arguments
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Cari command
    const command = client.commands.get(commandName);
    if (!command) return;

    // Execute command
    try {
        await command.execute(message, args);
    } catch (error) {
        console.error(`❌ Error executing command ${commandName}:`, error);
        message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#FF0000')
                    .setDescription(`❌ Terjadi error saat menjalankan command: ${error.message}`)
            ]
        }).catch(console.error);
    }
});

// ─── Error Handling ──────────────────────────────────────
client.on('error', (error) => {
    console.error('❌ [Client Error]:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ [Unhandled Rejection]:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ [Uncaught Exception]:', error);
});

// ─── Login ───────────────────────────────────────────────
if (!config.token) {
    console.error('\n❌ ═══════════════════════════════════════════════');
    console.error('   DISCORD_TOKEN tidak ditemukan!');
    console.error('   1. Buat file .env di root folder');
    console.error('   2. Isi dengan: DISCORD_TOKEN=your_token_here');
    console.error('   3. Dapatkan token dari: https://discord.com/developers/applications');
    console.error('═══════════════════════════════════════════════\n');
    process.exit(1);
} else {
    client.login(config.token);
}
