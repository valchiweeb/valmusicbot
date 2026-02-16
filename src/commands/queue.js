const { createEmbed } = require('../utils/embedFactory');
const config = require('../../config');
const { getQueue } = require('../utils/player');

module.exports = {
    name: 'queue',
    aliases: ['q'],
    description: 'Tampilkan daftar antrian lagu',
    async execute(message) {
        const queue = getQueue(message.guild.id);

        if (!queue || queue.songs.length === 0) {
            return message.reply({
                embeds: [
                    createEmbed({
                        color: '#FF0000',
                        description: '❌ Queue kosong! Gunakan `!play` untuk menambah lagu.'
                    })
                ]
            });
        }

        const songs = queue.songs;
        const nowPlaying = songs[0];

        // Buat list lagu (max 10)
        let queueList = '';
        const upcomingSongs = songs.slice(1, 11);

        if (upcomingSongs.length > 0) {
            queueList = upcomingSongs
                .map((song, index) =>
                    `**${index + 1}.** [${song.title}](${song.url}) — \`${song.duration}\` — <@${song.requestedById}>`
                )
                .join('\n');
        } else {
            queueList = 'Tidak ada lagu berikutnya dalam queue.';
        }

        const footer = songs.length > 11
            ? { text: `...dan ${songs.length - 11} lagu lainnya` }
            : null;

        const embed = createEmbed({
            title: '📋 Queue Musik',
            fields: [
                {
                    name: '🎶 Sedang Diputar',
                    value: `**[${nowPlaying.title}](${nowPlaying.url})** — \`${nowPlaying.duration}\``
                },
                {
                    name: `📋 Antrian (${songs.length - 1} lagu)`,
                    value: queueList
                }
            ],
            footer: footer,
            timestamp: true
        });

        message.reply({ embeds: [embed] });
    },
};
