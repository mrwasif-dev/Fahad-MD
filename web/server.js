const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const config = require('../config');
const state = require('../lib/state');
const { getSettings, Settings } = require('../lib/database');

function requireAuth(req, res, next) {
  if (req.cookies?.fahad_token === config.DASHBOARD_PASSWORD) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

function startWebServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

  // ----- Auth -----
  app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === config.DASHBOARD_PASSWORD) {
      res.cookie('fahad_token', password, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
      return res.json({ ok: true });
    }
    return res.status(401).json({ ok: false, error: 'Wrong password' });
  });

  app.post('/api/logout', (req, res) => {
    res.clearCookie('fahad_token');
    res.json({ ok: true });
  });

  // ----- Connection status / QR / Pair -----
  app.get('/api/status', requireAuth, (req, res) => {
    res.json({
      connection: state.connection,
      connected: state.connection === 'open',
      botNumber: state.sock?.user?.id?.split(':')[0] || null,
      botName: config.BOT_NAME,
      uptime: state.startedAt ? Date.now() - state.startedAt : 0
    });
  });

  app.get('/api/qr', requireAuth, (req, res) => {
    res.json({ qr: state.qrDataURL });
  });

  app.post('/api/pair', requireAuth, (req, res) => {
    const { phone } = req.body;
    if (!phone || phone.length < 8) return res.status(400).json({ error: 'Invalid phone number' });
    state.requestedPairPhone = phone.replace(/[^0-9]/g, '');
    state.pairingCode = null;
    res.json({ ok: true });
  });

  app.get('/api/pair/result', requireAuth, (req, res) => {
    res.json({ code: state.pairingCode });
  });

  app.post('/api/relink', requireAuth, async (req, res) => {
    try {
      if (state.sock?.clearSession) await state.sock.clearSession();
      if (state.sock) state.sock.end(undefined);
      res.json({ ok: true, message: 'Session cleared. Bot is restarting - refresh in a few seconds to get a new QR/Pair option.' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ----- Settings -----
  app.get('/api/settings', requireAuth, async (req, res) => {
    const settings = await getSettings();
    res.json(settings);
  });

  app.post('/api/settings', requireAuth, async (req, res) => {
    try {
      const allowed = [
        'botName', 'prefix', 'mode', 'ownerNumbers', 'supportNumber',
        'antidelete', 'antiviewonce', 'autoStatusView', 'autoStatusReact',
        'autoforward', 'welcome', 'goodbye'
      ];
      const update = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) update[key] = req.body[key];
      }
      const settings = await Settings.findOneAndUpdate(
        { sessionId: config.SESSION_ID },
        { $set: update },
        { new: true, upsert: true }
      );
      res.json(settings);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.listen(config.PORT, () => {
    console.log(`🌐 Dashboard running on port ${config.PORT} (open the app URL in your browser)`);
  });

  return app;
}

module.exports = { startWebServer };
