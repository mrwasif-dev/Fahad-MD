const { getContentType, downloadMediaMessage } = require('@whiskeysockets/baileys');

/**
 * Converts a raw Baileys message object into a clean, easy-to-use "m" object
 * that all plugins receive.
 */
function serialize(msg, sock) {
  if (!msg.message) return null;

  const m = {};
  m.key = msg.key;
  m.id = msg.key.id;
  m.chat = msg.key.remoteJid;
  m.isGroup = m.chat.endsWith('@g.us');
  m.isStatus = m.chat === 'status@broadcast';
  m.fromMe = msg.key.fromMe;
  m.sender = (m.isGroup || m.isStatus) ? (msg.key.participant || msg.participant) : m.chat;
  m.pushName = msg.pushName || 'Unknown';

  m.type = getContentType(msg.message) || 'unknown';

  // detect view-once BEFORE unwrapping (needed by antiviewonce plugin)
  m.isViewOnce =
    m.type === 'viewOnceMessage' ||
    m.type === 'viewOnceMessageV2' ||
    m.type === 'viewOnceMessageV2Extension' ||
    !!msg.message?.imageMessage?.viewOnce ||
    !!msg.message?.videoMessage?.viewOnce;

  // unwrap ephemeral / viewOnce wrappers to get to the real content
  let content = msg.message;
  if (content[m.type]?.message) {
    content = content[m.type].message;
    m.type = getContentType(content) || m.type;
  }
  m.message = content;

  // extract plain text body from whichever message type it is
  m.body =
    content?.conversation ||
    content?.extendedTextMessage?.text ||
    content?.imageMessage?.caption ||
    content?.videoMessage?.caption ||
    content?.documentMessage?.caption ||
    content?.buttonsResponseMessage?.selectedButtonId ||
    content?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    '';

  // context info (needed for forwarded/quoted/mentions detection)
  const contextInfo =
    content?.extendedTextMessage?.contextInfo ||
    content?.imageMessage?.contextInfo ||
    content?.videoMessage?.contextInfo ||
    content?.[m.type]?.contextInfo ||
    {};

  m.mentionedJid = contextInfo.mentionedJid || [];
  m.isForwarded = !!contextInfo.isForwarded || (contextInfo.forwardingScore || 0) > 0;
  m.quoted = contextInfo.quotedMessage
    ? {
        key: {
          remoteJid: m.chat,
          id: contextInfo.stanzaId,
          participant: contextInfo.participant
        },
        message: contextInfo.quotedMessage
      }
    : null;

  // convenience reply function
  m.reply = async (text, opts = {}) => {
    return sock.sendMessage(m.chat, { text, ...opts }, { quoted: msg });
  };

  m.react = async (emoji) => {
    return sock.sendMessage(m.chat, { react: { text: emoji, key: m.key } });
  };

  m.download = async () => {
    return downloadMediaMessage(msg, 'buffer', {});
  };

  m.raw = msg;
  return m;
}

module.exports = { serialize };
