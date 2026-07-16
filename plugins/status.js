const { Settings } = require('../lib/database');

module.exports = {
  name: 'status',
  command: ['autostatus', 'save', 'statusreact'],
  category: 'status',
  description: 'Status management: autostatus on/off, statusreact on/off, save (reply to a saved status to re-send it to yourself)',
  execute: async (sock, m, args, ctx) => {
    const cmd = m.body.slice((ctx.settings.prefix || ctx.config.PREFIX).length).trim().split(/\s+/)[0].toLowerCase();

    if (cmd === 'autostatus' || cmd === 'statusreact') {
      if (!ctx.isOwner) return m.reply('🚫 Only the bot owner can change this setting.');
      const on = (args[0] || '').toLowerCase() === 'on';
      const field = cmd === 'autostatus' ? 'autoStatusView' : 'autoStatusReact';
      await Settings.updateOne({ sessionId: ctx.config.SESSION_ID }, { $set: { [field]: on } }, { upsert: true });
      return m.reply(`✅ ${cmd} turned ${on ? 'ON' : 'OFF'}.`);
    }

    if (cmd === 'save') {
      if (!m.quoted) return m.reply('❗ Reply to a status/media message with .save');
      try {
        const { serialize } = require('../lib/serialize');
        const quotedRaw = { key: m.quoted.key, message: m.quoted.message };
        const qm = serialize(quotedRaw, sock);
        const buffer = await qm.download();
        const isVideo = qm.type === 'videoMessage';
        const isImage = qm.type === 'imageMessage';
        if (isVideo) {
          await sock.sendMessage(m.chat, { video: buffer, caption: '✅ Saved' }, { quoted: m.raw });
        } else if (isImage) {
          await sock.sendMessage(m.chat, { image: buffer, caption: '✅ Saved' }, { quoted: m.raw });
        } else {
          await sock.sendMessage(m.chat, { document: buffer, fileName: 'saved_file' }, { quoted: m.raw });
        }
      } catch (e) {
        return m.reply(`❌ Could not save: ${e.message}`);
      }
    }
  }
};
