const { Settings } = require('../lib/database');

module.exports = {
  name: 'antidelete',
  command: ['antidelete'],
  category: 'security',
  description: 'Toggle Anti-Delete (on/off). When on, deleted messages are re-sent to the owner.',
  ownerOnly: true,
  execute: async (sock, m, args, ctx) => {
    const on = (args[0] || '').toLowerCase() === 'on';
    await Settings.updateOne({ sessionId: ctx.config.SESSION_ID }, { $set: { antidelete: on } }, { upsert: true });
    return m.reply(`✅ Anti-Delete turned ${on ? 'ON' : 'OFF'}.`);
  }
};
