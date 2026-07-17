require('dotenv').config();
const chalk = require('chalk');
const QRCode = require('qrcode');
const pino = require('pino');
const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');

const config = require('./config');
const state = require('./lib/state');
const { connectDB, getSettings, User, Group } = require('./lib/database');
const { useMongoAuthState } = require('./lib/mongoAuthState');
const { loadPlugins } = require('./lib/pluginHandler');
const { serialize } = require('./lib/serialize');
const { startWebServer } = require('./web/server');

// simple in-memory recent-message cache, used by antidelete/antiviewonce plugins
const messageStore = new Map(); // key: chat:id  -> serialized m
const MAX_STORE = 500;
function cacheMessage(m) {
  messageStore.set(`${m.chat}:${m.id}`, m);
  if (messageStore.size > MAX_STORE) {
    const firstKey = messageStore.keys().next().value;
    messageStore.delete(firstKey);
  }
}

let commandMap, allPlugins;

async function startBot() {
  const { state: authState, saveCreds, clearSession } = await useMongoAuthState(config.SESSION_ID);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: {
      creds: authState.creds,
      keys: makeCacheableSignalKeyStore(authState.keys, pino({ level: 'silent' }))
    },
    browser: [config.BOT_NAME, 'Chrome', '1.0.0'],
    generateHighQualityLinkPreview: true
  });

  state.sock = sock;
  sock.clearSession = clearSession;

  // ----- Pairing code flow (triggered instantly from web dashboard) -----
  sock.ev.on('creds.update', saveCreds);

  const onPairRequest = async (phone) => {
    try {
      if (sock.authState.creds.registered) {
        state.pairingError = 'Device is already linked. Unlink first to request a new pairing code.';
        return;
      }
      // small delay avoids racing the initial QR generation right after socket creation
      await new Promise((r) => setTimeout(r, 1500));
      const code = await sock.requestPairingCode(phone);
      state.pairingCode = code;
      state.pairingError = null;
      console.log(chalk.green(`🔗 Pairing code for ${phone}: ${code}`));
    } catch (e) {
      state.pairingError = e.message || 'Failed to generate pairing code. Try again.';
      console.error('Pairing code error:', e.message);
    }
  };
  state.on('pair-request', onPairRequest);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      state.qrDataURL = await QRCode.toDataURL(qr);
    }

    if (connection) state.connection = connection;

    if (connection === 'open') {
      state.qrDataURL = null;
      state.pairingCode = null;
      state.pairingError = null;
      state.lastError = null;
      console.log(chalk.green(`✅ ${config.BOT_NAME} connected as ${sock.user?.id}`));
    }

    if (connection === 'close') {
      state.off('pair-request', onPairRequest);
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      state.lastError = lastDisconnect?.error?.message || `Connection closed (code ${statusCode || 'unknown'})`;
      console.log(chalk.red(`⚠️ Connection closed. Reason: ${statusCode || 'unknown'} — ${state.lastError}`));
      if (loggedOut) {
        console.log(chalk.yellow('🔴 Logged out. Clearing session, please re-link via dashboard.'));
        await clearSession();
      }
      setTimeout(() => startBot(), 3000);
    }
  });

  sock.ev.on('groups.update', async ([g]) => {
    try {
      await Group.updateOne({ jid: g.id }, { $set: { name: g.subject } }, { upsert: true });
    } catch (e) {}
  });

  sock.ev.on('group-participants.update', async (ev) => {
    try {
      const settings = await getSettings();
      if (!settings.welcome) return;
      const groupMeta = await sock.groupMetadata(ev.id);
      for (const participant of ev.participants) {
        const num = participant.split('@')[0];
        if (ev.action === 'add') {
          await sock.sendMessage(ev.id, {
            text: `👋 Welcome @${num} to *${groupMeta.subject}*!\n\nPlease read the group description and enjoy your stay.`,
            mentions: [participant]
          });
        } else if (ev.action === 'remove') {
          await sock.sendMessage(ev.id, {
            text: `👋 @${num} has left the group.`,
            mentions: [participant]
          });
        }
      }
    } catch (e) {
      console.error('group-participants.update error:', e.message);
    }
  });

  // ----- Main message handler -----
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const raw of messages) {
      try {
        await handleMessage(sock, raw);
      } catch (err) {
        console.error('handleMessage error:', err);
      }
    }
  });

  return sock;
}

async function handleMessage(sock, raw) {
  if (!raw.message) return;

  // ----- Handle "revoke" (delete for everyone) events for antidelete -----
  if (raw.message.protocolMessage?.type === 0 /* REVOKE */) {
    const settings = await getSettings();
    if (settings.antidelete) {
      const revokedId = raw.message.protocolMessage.key.id;
      const cached = messageStore.get(`${raw.key.remoteJid}:${revokedId}`);
      if (cached) {
        const ownerJid = `${config.OWNER_NUMBER}@s.whatsapp.net`;
        await sock.sendMessage(ownerJid, {
          text: `🗑️ *Anti-Delete*\nDeleted by: @${(cached.sender || '').split('@')[0]}\nChat: ${cached.chat}\n\nContent:\n${cached.body || '[non-text media]'}`,
          mentions: [cached.sender]
        });
      }
    }
    return;
  }

  const m = serialize(raw, sock);
  if (!m || m.fromMe) {
    // still cache own messages so replies to them work with antidelete off-target
  }
  if (!m) return;

  cacheMessage(m);

  const settings = await getSettings();

  // ----- Anti-ViewOnce -----
  if (m.isViewOnce && settings.antiviewonce) {
    try {
      const buffer = await m.download();
      const ownerJid = `${config.OWNER_NUMBER}@s.whatsapp.net`;
      const isVideo = m.type === 'videoMessage';
      await sock.sendMessage(ownerJid, {
        [isVideo ? 'video' : 'image']: buffer,
        caption: `👁️ *Anti-ViewOnce*\nFrom: @${(m.sender || '').split('@')[0]}\nChat: ${m.chat}`,
        mentions: [m.sender]
      });
    } catch (e) {
      console.error('antiviewonce error:', e.message);
    }
  }

  // ----- Status (story) auto view / auto react -----
  if (m.isStatus && !m.fromMe) {
    try {
      if (settings.autoStatusView) {
        await sock.readMessages([m.key]);
      }
      if (settings.autoStatusReact) {
        await sock.sendMessage(m.chat, { react: { text: '❤️', key: m.key } }, { statusJidList: [m.sender] });
      }
    } catch (e) {
      console.error('status auto view/react error:', e.message);
    }
    return; // status updates never go through command dispatch
  }

  if (m.fromMe) return; // don't process own commands further (except caches above)

  // ----- Ban check -----
  const userDoc = await User.findOneAndUpdate(
    { jid: m.sender },
    { $setOnInsert: { jid: m.sender, name: m.pushName } },
    { upsert: true, new: true }
  );
  if (userDoc.banned) return;

  // ----- Bot mode (public/private) -----
  const isOwner = m.sender.split('@')[0] === config.OWNER_NUMBER || settings.ownerNumbers.includes(m.sender.split('@')[0]);
  if (settings.mode === 'private' && !isOwner) return;

  // ----- Group muted check -----
  if (m.isGroup) {
    const groupDoc = await Group.findOne({ jid: m.chat });
    if (groupDoc?.muted && !isOwner) return;
  }

  // ----- Auto-forward (runs independent of prefix commands) -----
  require('./plugins/autoforward').watcher(sock, m, settings).catch(() => {});

  // ----- Command dispatch -----
  const prefix = settings.prefix || config.PREFIX;
  if (!m.body || !m.body.startsWith(prefix)) return;

  const withoutPrefix = m.body.slice(prefix.length).trim();
  const [cmdRaw, ...args] = withoutPrefix.split(/\s+/);
  const cmd = (cmdRaw || '').toLowerCase();
  if (!cmd) return;

  const plugin = commandMap.get(cmd);
  if (!plugin) return;

  // permission checks
  if (plugin.ownerOnly && !isOwner) return m.reply('🚫 This command is for the bot owner only.');
  if (plugin.groupOnly && !m.isGroup) return m.reply('🚫 This command only works inside groups.');
  if (plugin.privateOnly && m.isGroup) return m.reply('🚫 This command only works in private chat.');

  if (plugin.adminOnly && m.isGroup) {
    const groupMeta = await sock.groupMetadata(m.chat);
    const senderIsAdmin = groupMeta.participants.some(
      (p) => p.id === m.sender && (p.admin === 'admin' || p.admin === 'superadmin')
    );
    if (!senderIsAdmin && !isOwner) return m.reply('🚫 This command is for group admins only.');
  }

  const ctx = { config, settings, isOwner, User, Group, allPlugins, commandMap };

  try {
    await plugin.execute(sock, m, args, ctx);
  } catch (err) {
    console.error(`Error in plugin "${plugin.name}":`, err);
    await m.reply(`❌ An error occurred while running *${cmd}*:\n${err.message}`);
  }
}

function printBanner() {
  const line = '═'.repeat(46);
  console.log(chalk.green(`╔${line}╗`));
  console.log(chalk.green('║') + chalk.bold.white(`   🤖  ${config.BOT_NAME} — Professional WhatsApp Bot   `.padEnd(46)) + chalk.green('║'));
  console.log(chalk.green(`╠${line}╣`));
  console.log(chalk.green('║') + chalk.gray(`   Engine     : Baileys (Multi-Device)`.padEnd(46)) + chalk.green('║'));
  console.log(chalk.green('║') + chalk.gray(`   Database   : MongoDB`.padEnd(46)) + chalk.green('║'));
  console.log(chalk.green('║') + chalk.gray(`   Mode       : ${config.BOT_MODE}`.padEnd(46)) + chalk.green('║'));
  console.log(chalk.green('║') + chalk.gray(`   Support    : ${config.SUPPORT_NUMBER}`.padEnd(46)) + chalk.green('║'));
  console.log(chalk.green(`╚${line}╝`));
}

async function main() {
  printBanner();
  console.log(chalk.cyan(`🚀 Starting ${config.BOT_NAME}...`));
  await connectDB();

  const loaded = loadPlugins();
  commandMap = loaded.commandMap;
  allPlugins = loaded.allPlugins;

  state.startedAt = Date.now();

  startWebServer(); // dashboard for QR / Pair / Settings
  await startBot();
}

main().catch((err) => {
  console.error('Fatal error starting bot:', err);
  process.exit(1);
});
