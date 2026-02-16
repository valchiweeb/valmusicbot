const { createEmbed } = require('../utils/embedFactory');
const config = require('../../config');
const { getQueue } = require('../utils/player');

module.exports = {
    name: 'resume',
    aliases: ['unpause'],
    description: 'Lanjutkan musik yang dipause',
    async execute(message) {
        const queue = getQueue(message.guild.id);

        if (!queue) {
            return message.reply({
                embeds: [
                    createEmbed({ color: '#FF0000', description: '❌ Tidak ada lagu yang sedang diputar!' })
                ]
            });
        }

        if (queue.player.unpause()) {
            message.reply({
                embeds: [
                    createEmbed({ description: '▶️ Musik dilanjutkan.' })
                ]
            });
        } else {
            message.reply({
                embeds: [
                    createEmbed({ color: '#FF0000', description: '❌ Gagal resume musik (mungkin sudah playing?).' })
                ]
            });
        }
    },
};
