module.exports = {
  name: 'menu',
  command: ['menu', 'help'],
  category: 'general',
  description: 'Show list of all commands',
  execute: async (sock, m, args, ctx) => {
    const { settings, allPlugins, config } = ctx;
    const prefix = settings.prefix || config.PREFIX;

    const categories = {};
    for (const p of allPlugins) {
      const cat = p.category || 'misc';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(p);
    }

    let text = `╭───「 *${settings.botName || config.BOT_NAME}* 」\n`;
    text += `│ Mode: ${settings.mode}\n`;
    text += `│ Prefix: ${prefix}\n`;
    text += `│ Support: wa.me/${config.SUPPORT_NUMBER.replace(/[^0-9]/g, '')}\n`;
    text += `╰────────────────\n\n`;

    for (const cat of Object.keys(categories)) {
      text += `*┏━ ${cat.toUpperCase()} ━┓*\n`;
      for (const p of categories[cat]) {
        const cmds = Array.isArray(p.command) ? p.command[0] : p.command;
        text += `┃ ${prefix}${cmds} - ${p.description || ''}\n`;
      }
      text += `┗━━━━━━━━━━━┛\n\n`;
    }

    await m.reply(text.trim());
  }
};
