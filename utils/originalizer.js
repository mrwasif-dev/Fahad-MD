/**
 * "Originalizer" - rebuilds an outgoing message payload from an incoming
 * message WITHOUT any of the metadata that marks it as forwarded/external:
 *  - removes contextInfo.isForwarded / forwardingScore
 *  - removes contextInfo.forwardedNewsletterMessageInfo (channel/newsletter tag)
 *  - removes contextInfo.externalAdReply (link preview "ad" style tag)
 *  - drops quoted-message reference
 *
 * Used by the forward.js and autoforward.js plugins so that whatever is
 * forwarded through the bot arrives as a clean, original-looking message.
 */
function stripContext(contextInfo = {}) {
  const clean = { ...contextInfo };
  delete clean.isForwarded;
  delete clean.forwardingScore;
  delete clean.forwardedNewsletterMessageInfo;
  delete clean.externalAdReply;
  delete clean.quotedMessage;
  delete clean.stanzaId;
  delete clean.participant;
  delete clean.remoteJid;
  return clean;
}

/**
 * Builds a sendMessage-ready payload (for sock.sendMessage) from a serialized
 * message "m" (see lib/serialize.js), stripped of any forwarding metadata.
 */
function buildOriginalPayload(m) {
  const type = m.type;
  const content = m.message;

  switch (type) {
    case 'conversation':
    case 'extendedTextMessage': {
      return { text: m.body };
    }
    case 'imageMessage': {
      return {
        image: { url: undefined }, // filled by caller with downloaded buffer
        caption: content.imageMessage?.caption || ''
      };
    }
    case 'videoMessage': {
      return {
        video: { url: undefined },
        caption: content.videoMessage?.caption || '',
        gifPlayback: content.videoMessage?.gifPlayback || false
      };
    }
    case 'documentMessage': {
      return {
        document: { url: undefined },
        mimetype: content.documentMessage?.mimetype,
        fileName: content.documentMessage?.fileName || 'file'
      };
    }
    case 'audioMessage': {
      return {
        audio: { url: undefined },
        mimetype: content.audioMessage?.mimetype || 'audio/mp4',
        ptt: content.audioMessage?.ptt || false
      };
    }
    case 'stickerMessage': {
      return { sticker: { url: undefined } };
    }
    default:
      return { text: m.body || '' };
  }
}

/**
 * Sends "m" to targetJid stripped of forwarding/newsletter metadata so it
 * looks like an original message. Handles text and common media types.
 */
async function sendOriginal(sock, targetJid, m) {
  const type = m.type;

  if (type === 'conversation' || type === 'extendedTextMessage') {
    return sock.sendMessage(targetJid, { text: m.body || '' });
  }

  // media types: download then re-upload as a brand-new message (no contextInfo at all)
  const buffer = await m.download();

  if (type === 'imageMessage') {
    return sock.sendMessage(targetJid, { image: buffer, caption: m.message?.imageMessage?.caption || '' });
  }
  if (type === 'videoMessage') {
    return sock.sendMessage(targetJid, {
      video: buffer,
      caption: m.message?.videoMessage?.caption || '',
      gifPlayback: m.message?.videoMessage?.gifPlayback || false
    });
  }
  if (type === 'audioMessage') {
    return sock.sendMessage(targetJid, {
      audio: buffer,
      mimetype: m.message?.audioMessage?.mimetype || 'audio/mp4',
      ptt: m.message?.audioMessage?.ptt || false
    });
  }
  if (type === 'documentMessage') {
    return sock.sendMessage(targetJid, {
      document: buffer,
      mimetype: m.message?.documentMessage?.mimetype,
      fileName: m.message?.documentMessage?.fileName || 'file'
    });
  }
  if (type === 'stickerMessage') {
    return sock.sendMessage(targetJid, { sticker: buffer });
  }

  // fallback: send as text summary
  return sock.sendMessage(targetJid, { text: m.body || '[unsupported media type]' });
}

module.exports = { stripContext, buildOriginalPayload, sendOriginal };
