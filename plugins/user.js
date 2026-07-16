const { User } = require('../lib/database');

async function getTarget(m, args) {
  if (m.mentionedJid?.length) return m.mentionedJid[0];
  if (m.quoted) return m.quoted.key.participant;
  if (args[0]) {
    const num = args[0].replace(/[^0-9]/g, '');
    if (num) return `${num}@s.whatsapp.net`;
  }
  return null;
}

module.exports = {
  name: 'user',
  command: ['ban', 'unban', 'warn', 'unwarn', 'profile', 'banlist'],
  category: 'user',
  description: 'User management (ban/unban/warn/unwarn/profile/banlist)',
  execute: async (sock, m, args, ctx) => {
    const cmd = m.body.slice((ctx.settings.prefix || ctx.config.PREFIX).length).trim().split(/\s+/)[0].toLowerCase();

    if (['ban', 'unban', 'warn', 'unwarn'].includes(cmd) && !ctx.isOwner) {
      return m.reply('🚫 Only the bot owner can manage users.');
    }

    switch (cmd) {
      case 'ban': {
        const target = await getTarget(m, args);
        if (!target) return m.reply('❗ Tag, reply or give a number to ban.');
        await User.updateOne({ jid: target }, { $set: { banned: true } }, { upsert: true });
        return m.reply(`🚫 @${target.split('@')[0]} has been banned from using the bot.`, { mentions: [target] });
      }
      case 'unban': {
        const target = await getTarget(m, args);
        if (!target) return m.reply('❗ Tag, reply or give a number to unban.');
        await User.updateOne({ jid: target }, { $set: { banned: false } }, { upsert: true });
        return m.reply(`✅ @${target.split('@')[0]} has been unbanned.`, { mentions: [target] });
      }
      case 'warn': {
        const target = await getTarget(m, args);
        if (!target) return m.reply('❗ Tag, reply or give a number to warn.');
        const doc = await User.findOneAndUpdate(
          { jid: target },
          { $inc: { warns: 1 } },
          { upsert: true, new: true }
        );
        return m.reply(`⚠️ @${target.split('@')[0]} warned. Total warns: ${doc.warns}`, { mentions: [target] });
      }
      case 'unwarn': {
        const target = await getTarget(m, args);
        if (!target) return m.reply('❗ Tag, reply or give a number.');
        const doc = await User.findOne({ jid: target });
        const newWarns = Math.max(0, (doc?.warns || 0) - 1);
        await User.updateOne({ jid: target }, { $set: { warns: newWarns } }, { upsert: true });
        return m.reply(`✅ @${target.split('@')[0]} warns reduced to ${newWarns}`, { mentions: [target] });
      }
      case 'profile': {
        const target = (await getTarget(m, args)) || m.sender;
        const doc = await User.findOne({ jid: target });
        return m.reply(
          `👤 *Profile*\nNumber: @${target.split('@')[0]}\nBanned: ${doc?.banned ? 'Yes' : 'No'}\nWarns: ${doc?.warns || 0}`,
          { mentions: [target] }
        );
      }
      case 'banlist': {
        const banned = await User.find({ banned: true });
        if (!banned.length) return m.reply('✅ No banned users.');
        const text = banned.map((u, i) => `${i + 1}. @${u.jid.split('@')[0]}`).join('\n');
        return sock.sendMessage(m.chat, { text: `🚫 *Banned Users*\n${text}`, mentions: banned.map((u) => u.jid) });
      }
    }
  }
};
