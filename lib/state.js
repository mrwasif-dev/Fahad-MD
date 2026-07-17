const { EventEmitter } = require('events');

/**
 * Shared runtime state, accessible by both the WhatsApp socket (index.js)
 * and the Express web dashboard (web/server.js) inside the same process.
 * Extends EventEmitter so the dashboard's pairing request reaches the
 * socket immediately instead of relying on a slow polling loop.
 */
class BotState extends EventEmitter {
  constructor() {
    super();
    this.sock = null;
    this.qrDataURL = null;      // latest QR code as data URL (for dashboard)
    this.pairingCode = null;    // latest pairing code
    this.pairingError = null;   // last pairing error message, shown on dashboard
    this.connection = 'close';  // close | connecting | open
    this.startedAt = null;
    this.lastError = null;      // last connection error, shown on dashboard
  }

  requestPair(phone) {
    this.pairingCode = null;
    this.pairingError = null;
    this.emit('pair-request', phone);
  }
}

module.exports = new BotState();
