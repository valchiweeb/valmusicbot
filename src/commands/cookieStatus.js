const { createEmbed } = require('../utils/embedFactory');
const config = require('../../config');
const cookieManager = require('../utils/cookieManager');

module.exports = {
    name: 'cookie-status',
    aliases: ['cookies', 'status'],
    description: 'Cek status cookies YouTube',
    async execute(message) {
        const status = cookieManager.getStatus();

        const color = status.valid ? '#1DB954' : '#FF0000';
        const description = status.valid
            ? `✅ **Cookies Aktif**\nJumlah: ${status.count}`
            : '⚠️ **Cookies Tidak Aktif / Expired**\nBot mungkin akan kesulitan memutar lagu YouTube.';

        const embed = createEmbed({
            color: color,
            title: '🍪 Cookie Status',
            description: description,
            fields: [
                {
                    name: 'Last Checked',
                    value: status.lastChecked ? new Date(status.lastChecked).toLocaleString() : 'Never',
                    inline: true
                }
            ],
            footer: { text: 'Gunakan !reload-cookies jika bermasalah.' },
            timestamp: true
        });

        message.reply({ embeds: [embed] });
    },
};
