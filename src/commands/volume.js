const { createEmbed } = require('../utils/embedFactory');
const config = require('../../config');
const { getQueue } = require('../utils/player');

module.exports = {
    name: 'volume',
    aliases: ['v', 'vol'],
    description: 'Atur volume musik',
    async execute(message, args) {
        // Volume dinonaktifkan sementara untuk stabilitas audio (Direct Opus Streaming)
        // Jika ingin mengaktifkan kembali, set inlineVolume: true di player.js, tapi berisiko stuttering.
        return message.reply({
            embeds: [
                createEmbed({
                    color: '#FF0000',
                    description: '⚠️ **Fitur Volume Dinonaktifkan**\nDemi kualitas audio terbaik dan anti-stuttering, volume control dimatikan sementara.'
                })
            ]
        });
    },
};
