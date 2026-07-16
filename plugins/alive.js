module.exports = {
  name: 'alive',
  command: ['alive', 'owner'],
  category: 'general',
  description: 'Check if bot is alive / get owner contact',
  execute: async (sock, m, args, ctx) => {
    const { config, settings } = ctx;
    const uptimeSec = Math.floor((Date.now() - require('../lib/state').startedAt) / 1000);
    const h = Math.floor(uptimeSec / 3600);
    const min = Math.floor((uptimeSec % 3600) / 60);
    const sec = uptimeSec % 60;

    await m.reply(
      `✅ *${settings.botName || config.BOT_NAME}* is alive!\n\n` +
      `⏱️ Uptime: ${h}h ${min}m ${sec}s\n` +
      `📞 Support: wa.me/${config.SUPPORT_NUMBER.replace(/[^0-9]/g, '')}\n` +
      `👑 Owner: wa.me/${config.OWNER_NUMBER}`
    );
  }
};
