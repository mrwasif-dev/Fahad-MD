const { Group } = require('../lib/database');

async function getTargets(sock, m, args) {
  if (m.mentionedJid?.length) return m.mentionedJid;
  if (m.quoted) return [m.quoted.key.participant];
  if (args[0]) {
    const num = args[0].replace(/[^0-9]/g, '');
    if (num) return [`${num}@s.whatsapp.net`];
  }
  return [];
}

module.exports = {
  name: 'group',
  command: ['kick', 'add', 'promote', 'demote', 'mute', 'unmute', 'tagall', 'link', 'revoke', 'setname', 'setdesc'],
  category: 'group',
  description: 'Group management (kick/add/promote/demote/mute/unmute/tagall/link/revoke/setname/setdesc)',
  groupOnly: true,
  adminOnly: true,
  execute: async (sock, m, args, ctx) => {
    const cmd = m.body.slice((ctx.settings.prefix || ctx.config.PREFIX).length).trim().split(/\s+/)[0].toLowerCase();

    switch (cmd) {
      case 'kick': {
        const targets = await getTargets(sock, m, args);
        if (!targets.length) return m.reply('❗ Tag, reply or give a number to kick.');
        await sock.groupParticipantsUpdate(m.chat, targets, 'remove');
        return m.reply('✅ Removed successfully.');
      }
      case 'add': {
        if (!args[0]) return m.reply('❗ Usage: .add 923001234567');
        const num = args[0].replace(/[^0-9]/g, '');
        await sock.groupParticipantsUpdate(m.chat, [`${num}@s.whatsapp.net`], 'add');
        return m.reply('✅ Added successfully.');
      }
      case 'promote': {
        const targets = await getTargets(sock, m, args);
        if (!targets.length) return m.reply('❗ Tag, reply or give a number to promote.');
        await sock.groupParticipantsUpdate(m.chat, targets, 'promote');
        return m.reply('✅ Promoted to admin.');
      }
      case 'demote': {
        const targets = await getTargets(sock, m, args);
        if (!targets.length) return m.reply('❗ Tag, reply or give a number to demote.');
        await sock.groupParticipantsUpdate(m.chat, targets, 'demote');
        return m.reply('✅ Demoted from admin.');
      }
      case 'mute': {
        await Group.updateOne({ jid: m.chat }, { $set: { muted: true } }, { upsert: true });
        await sock.groupSettingUpdate(m.chat, 'announcement');
        return m.reply('🔇 Group muted. Only admins can send messages / use commands.');
      }
      case 'unmute': {
        await Group.updateOne({ jid: m.chat }, { $set: { muted: false } }, { upsert: true });
        await sock.groupSettingUpdate(m.chat, 'not_announcement');
        return m.reply('🔊 Group unmuted.');
      }
      case 'tagall': {
        const meta = await sock.groupMetadata(m.chat);
        const text = args.join(' ') || 'Attention everyone!';
        let msg = `📢 *${text}*\n\n`;
        const mentions = [];
        for (const p of meta.participants) {
          msg += `→ @${p.id.split('@')[0]}\n`;
          mentions.push(p.id);
        }
        return sock.sendMessage(m.chat, { text: msg, mentions });
      }
      case 'link': {
        const code = await sock.groupInviteCode(m.chat);
        return m.reply(`🔗 Group invite link:\nhttps://chat.whatsapp.com/${code}`);
      }
      case 'revoke': {
        await sock.groupRevokeInvite(m.chat);
        return m.reply('♻️ Group invite link revoked and regenerated.');
      }
      case 'setname': {
        const name = args.join(' ');
        if (!name) return m.reply('❗ Usage: .setname New Group Name');
        await sock.groupUpdateSubject(m.chat, name);
        return m.reply('✅ Group name updated.');
      }
      case 'setdesc': {
        const desc = args.join(' ');
        if (!desc) return m.reply('❗ Usage: .setdesc New description');
        await sock.groupUpdateDescription(m.chat, desc);
        return m.reply('✅ Group description updated.');
      }
    }
  }
};
