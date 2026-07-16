/**
 * Shared runtime state, accessible by both the WhatsApp socket (index.js)
 * and the Express web dashboard (web/server.js) inside the same process.
 */
module.exports = {
  sock: null,
  qrDataURL: null,        // latest QR code as data URL (for dashboard)
  pairingCode: null,      // latest pairing code
  connection: 'close',    // close | connecting | open
  startedAt: null,
  requestedPairPhone: null // phone number the dashboard asked to pair with
};
