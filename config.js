require('dotenv').config();

module.exports = {
    token: process.env.DISCORD_TOKEN,
    prefix: process.env.PREFIX || '!!',
    embedColor: '#FF0000',
    bannerUrl: process.env.BANNER_URL || null, // URL gambar banner promosi (opsional)
    maxQueueSize: 100,
    defaultVolume: 80,
    // Cookie settings
    cookieFile: './cookies.json',
    cookieRefreshInterval: 30 * 60 * 1000, // 30 menit
};
