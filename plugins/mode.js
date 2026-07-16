const { Settings } = require('../lib/database');

module.exports = {
  name: 'mode',
  command: ['mode'],
  category: 'security',
  description: 'Set bot mode: .mode public | .mode private',
  ownerOnly: true,
  execute: async (sock, m, args, ctx) => {
    const val = (args[0] || '').toLowerCase();
    if (!['public', 'private'].includes(val)) {
      return m.reply('❗ Usage: .mode public  OR  .mode private');
    }
    await Settings.updateOne({ sessionId: ctx.config.SESSION_ID }, { $set: { mode: val } }, { upsert: true });
    return m.reply(`✅ Bot mode set to *${val.toUpperCase()}*.`);
  }
};
