const { createEmbed } = require('../utils/embedFactory');
const config = require('../../config');
const { getQueue, destroyQueue } = require('../utils/player');

module.exports = {
    name: 'stop',
    aliases: ['leave', 'dc', 'disconnect'],
    description: 'Stop musik dan keluar dari voice channel',
    async execute(message) {
        const queue = getQueue(message.guild.id);

        if (!queue) {
            return message.reply({
                embeds: [
                    createEmbed({
                        color: '#FF0000',
                        description: '❌ Tidak ada lagu yang sedang diputar!'
                    })
                ]
            });
        }

        destroyQueue(message.guild.id);

        message.reply({
            embeds: [
                createEmbed({
                    description: '⏹️ Musik dihentikan dan bot keluar dari voice channel.'
                })
            ]
        });
    },
};
