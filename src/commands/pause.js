const { createEmbed } = require('../utils/embedFactory');
const config = require('../../config');
const { getQueue } = require('../utils/player');

module.exports = {
    name: 'pause',
    description: 'Pause musik yang sedang diputar',
    async execute(message) {
        const queue = getQueue(message.guild.id);

        if (!queue) {
            return message.reply({
                embeds: [
                    createEmbed({ color: '#FF0000', description: '❌ Tidak ada lagu yang sedang diputar!' })
                ]
            });
        }

        if (queue.player.pause()) {
            message.reply({
                embeds: [
                    createEmbed({ description: '⏸️ Musik di-pause.' })
                ]
            });
        } else {
            message.reply({
                embeds: [
                    createEmbed({ color: '#FF0000', description: '❌ Gagal pause musik (mungkin sudah pause?).' })
                ]
            });
        }
    },
};
