const { Settings } = require('../lib/database');

module.exports = {
  name: 'antiviewonce',
  command: ['antiviewonce'],
  category: 'security',
  description: 'Toggle Anti-ViewOnce (on/off). When on, view-once media is re-sent to the owner.',
  ownerOnly: true,
  execute: async (sock, m, args, ctx) => {
    const on = (args[0] || '').toLowerCase() === 'on';
    await Settings.updateOne({ sessionId: ctx.config.SESSION_ID }, { $set: { antiviewonce: on } }, { upsert: true });
    return m.reply(`✅ Anti-ViewOnce turned ${on ? 'ON' : 'OFF'}.`);
  }
};
