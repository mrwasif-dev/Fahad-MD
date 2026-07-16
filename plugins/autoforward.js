const { Settings } = require('../lib/database');
const { sendOriginal } = require('../utils/originalizer');

// Keeps track of which message ids we already forwarded, to avoid duplicates
// if messages.upsert fires more than once for the same id.
const forwardedCache = new Set();
const MAX_CACHE = 1000;

/**
 * Called for EVERY incoming message from index.js (independent of command
 * prefix). If auto-forward is enabled and this chat is a watched source,
 * the message gets forwarded (stripped of forwarding tags) to all targets.
 */
async function watcher(sock, m, settings) {
  const af = settings.autoforward;
  if (!af?.enabled || !af.targets?.length) return;
  if (m.fromMe || m.isStatus) return;

  const sources = af.sources || [];
  const isWatchedSource = sources.length === 0 || sources.includes(m.chat);
  if (!isWatchedSource) return;

  const cacheKey = `${m.chat}:${m.id}`;
  if (forwardedCache.has(cacheKey)) return;
  forwardedCache.add(cacheKey);
  if (forwardedCache.size > MAX_CACHE) {
    forwardedCache.delete(forwardedCache.values().next().value);
  }

  for (const target of af.targets) {
    try {
      await sendOriginal(sock, target, m);
    } catch (e) {
      console.error(`autoforward -> ${target} failed:`, e.message);
    }
  }
}

module.exports = {
  name: 'autoforward',
  command: ['autoforward', 'afsource', 'aftarget'],
  category: 'forward',
  description: 'Manage auto-forward: .autoforward on/off | .afsource add/remove <jid> | .aftarget add/remove <jid>',
  ownerOnly: true,
  execute: async (sock, m, args, ctx) => {
    const cmd = m.body.slice((ctx.settings.prefix || ctx.config.PREFIX).length).trim().split(/\s+/)[0].toLowerCase();
    const settings = await Settings.findOne({ sessionId: ctx.config.SESSION_ID });

    if (cmd === 'autoforward') {
      const on = (args[0] || '').toLowerCase() === 'on';
      settings.autoforward.enabled = on;
      await settings.save();
      return m.reply(`✅ Auto-Forward turned ${on ? 'ON' : 'OFF'}.`);
    }

    if (cmd === 'afsource' || cmd === 'aftarget') {
      const action = (args[0] || '').toLowerCase();
      const jid = args[1];
      if (!['add', 'remove'].includes(action) || !jid) {
        return m.reply(`❗ Usage: .${cmd} add <jid>  OR  .${cmd} remove <jid>\n(use .getid inside the group to find its jid)`);
      }
      const field = cmd === 'afsource' ? 'sources' : 'targets';
      if (action === 'add') {
        if (!settings.autoforward[field].includes(jid)) settings.autoforward[field].push(jid);
      } else {
        settings.autoforward[field] = settings.autoforward[field].filter((x) => x !== jid);
      }
      await settings.save();
      return m.reply(`✅ ${field} updated:\n${settings.autoforward[field].join('\n') || '(empty = all chats)'}`);
    }
  },
  watcher
};
