const { createEmbed } = require('../utils/embedFactory');
const config = require('../../config');
const cookieManager = require('../utils/cookieManager');

module.exports = {
    name: 'help',
    description: 'Menampilkan daftar perintah',
    aliases: ['h', 'commands'], // Restore aliases if they were there
    async execute(message, args) {
        const cookieStatus = cookieManager.getStatus();

        const embed = createEmbed({
            title: '📜 Daftar Perintah Music Bot',
            description: 'Bot musik Discord dengan bypass anti-robot YouTube menggunakan cookies.',
            fields: [
                {
                    name: '🎶 Musik',
                    value: [
                        `\`${config.prefix}play <judul/link>\` — Putar musik (YouTube/Spotify)`,
                        `\`${config.prefix}skip\` — Lewati lagu`,
                        `\`${config.prefix}stop\` — Stop & keluar`,
                        `\`${config.prefix}pause\` — Pause musik`,
                        `\`${config.prefix}resume\` — Lanjut putar`,
                        `\`${config.prefix}queue\` — Lihat antrian`,
                        `\`${config.prefix}np\` — Info lagu sekarang`,
                        `\`${config.prefix}volume <1-100>\` — Atur volume`,
                    ].join('\n')
                },
                {
                    name: '🍪 Cookie Management',
                    value: [
                        `\`${config.prefix}reload-cookies\` — Refresh cookies`,
                        `\`${config.prefix}cookie-status\` — Cek status cookies`,
                    ].join('\n')
                },
                {
                    name: '📊 Status Sistem',
                    value: cookieStatus.valid
                        ? `✅ **Cookies Aktif**: ${cookieStatus.count} cookies terload.`
                        : '⚠️ **Cookies Tidak Aktif**: Bot mungkin terblokir YouTube.',
                    inline: false
                }
            ],
            footer: { text: 'Gunakan cookies YouTube untuk menghindari blokir robot!' },
            timestamp: true
        });

        message.reply({ embeds: [embed] });
    },
};
