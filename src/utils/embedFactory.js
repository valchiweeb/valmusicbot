const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

/**
 * Buat Embed standar dengan banner promosi otomatis
 * @param {Object} options Options untuk embed
 * @returns {EmbedBuilder}
 */
function createEmbed(options = {}) {
    const embed = new EmbedBuilder();

    // Default Color
    if (config.embedColor) embed.setColor(config.embedColor);

    // Apply options
    if (options.color) embed.setColor(options.color);
    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);
    if (options.fields) embed.addFields(options.fields);
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.footer) embed.setFooter(options.footer);
    if (options.timestamp) embed.setTimestamp();
    if (options.url) embed.setURL(options.url);
    if (options.author) embed.setAuthor(options.author);

    // Banner Promosi (Auto-Inject)
    // Hanya jika user tidak set image secara manual di options (biar fleksibel)
    if (config.bannerUrl && !options.image) {
        embed.setImage(config.bannerUrl);
    } else if (options.image) {
        embed.setImage(options.image);
    }

    return embed;
}

module.exports = { createEmbed };
