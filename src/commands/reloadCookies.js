const { createEmbed } = require('../utils/embedFactory');
const config = require('../../config');
const cookieManager = require('../utils/cookieManager');

module.exports = {
    name: 'reload-cookies',
    aliases: ['reload'],
    description: 'Muat ulang cookies YouTube',
    async execute(message) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Hanya Admin yang bisa reload cookies.');
        }

        const msg = await message.reply({
            embeds: [createEmbed({ description: '🔄 Reloading cookies...' })]
        });

        const success = await cookieManager.loadCookies();

        if (success) {
            const status = cookieManager.getStatus();
            msg.edit({
                embeds: [
                    createEmbed({
                        color: '#1DB954',
                        title: '✅ Cookies Reloaded',
                        description: `Berhasil memuat **${status.count}** cookies.`
                    })
                ]
            });
        } else {
            msg.edit({
                embeds: [
                    createEmbed({
                        color: '#FF0000',
                        title: '❌ Reload Gagal',
                        description: 'Gagal memuat cookies. Cek console atau pastikan file cookies.json valid.'
                    })
                ]
            });
        }
    },
};
