const { createEmbed } = require('../utils/embedFactory');
const config = require('../../config');
const { getQueue } = require('../utils/player');
const cookieManager = require('../utils/cookieManager');

module.exports = {
    name: 'nowplaying',
    aliases: ['np', 'now'],
    description: 'Info lagu yang sedang diputar',
    async execute(message) {
        const queue = getQueue(message.guild.id);

        if (!queue || queue.songs.length === 0) {
            return message.reply({
                embeds: [
                    createEmbed({
                        color: '#FF0000',
                        description: '❌ Tidak ada lagu yang sedang diputar!'
                    })
                ]
            });
        }

        const song = queue.songs[0];
        const status = queue.playing ? '▶️ Playing' : '⏸️ Paused';
        const cookieStatus = cookieManager.getStatus();

        const embed = createEmbed({
            title: `🎶 ${status}`,
            description: `**[${song.title}](${song.url})**`,
            fields: [
                { name: '⏱️ Durasi', value: song.duration || 'Unknown', inline: true },
                { name: '🔊 Volume', value: `${queue.volume}%`, inline: true },
                { name: '👤 Requested by', value: song.requestedBy, inline: true },
                { name: '📋 Queue', value: `${queue.songs.length} lagu`, inline: true },
                {
                    name: '🍪 Cookie Status',
                    value: cookieStatus.valid ? `✅ Active (${cookieStatus.count})` : '⚠️ Tidak aktif',
                    inline: true
                }
            ],
            thumbnail: song.thumbnail || null,
            timestamp: true
        });

        message.reply({ embeds: [embed] });
    },
};
