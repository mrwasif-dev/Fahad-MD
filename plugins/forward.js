const { sendOriginal } = require('../utils/originalizer');
const { serialize } = require('../lib/serialize');

module.exports = {
  name: 'forward',
  command: ['forward', 'fwd'],
  category: 'forward',
  description: 'Reply to a message with .forward <number or group jid> to forward it as an original message',
  execute: async (sock, m, args) => {
    if (!m.quoted) return m.reply('❗ Reply to the message you want to forward, along with the target.\nExample: .forward 923001234567');
    if (!args[0]) return m.reply('❗ Provide a target number or group JID.\nExample: .forward 923001234567');

    let target = args[0];
    if (!target.includes('@')) {
      target = `${target.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    }

    try {
      const quotedRaw = { key: m.quoted.key, message: m.quoted.message };
      const qm = serialize(quotedRaw, sock);
      await sendOriginal(sock, target, qm);
      await m.reply(`✅ Forwarded to ${target.split('@')[0]} (original, no forward tag).`);
    } catch (e) {
      await m.reply(`❌ Forward failed: ${e.message}`);
    }
  }
};
