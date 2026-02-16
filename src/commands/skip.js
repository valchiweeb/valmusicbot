const { createEmbed } = require('../utils/embedFactory');
const config = require('../../config');
const { getQueue } = require('../utils/player');

module.exports = {
    name: 'skip',
    aliases: ['s', 'next'],
    description: 'Skip lagu yang sedang diputar',
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

        const currentSong = queue.songs[0];
        queue.player.stop(); // Force stop to trigger idle -> next song

        message.reply({
            embeds: [
                createEmbed({
                    description: `⏭️ Skipped: **${currentSong?.title || 'Unknown'}**`
                })
            ]
        });
    },
};
