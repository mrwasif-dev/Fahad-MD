const express = require('express');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const config = require('../config');
const state = require('../lib/state');
const { getSettings, Settings } = require('../lib/database');

// ----- Real session store (server-side, random tokens — not the raw password) -----
const SESSION_COOKIE = 'fahad_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const sessions = new Map(); // token -> expiresAt

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

function isValidSession(token) {
  if (!token || !sessions.has(token)) return false;
  const expiresAt = sessions.get(token);
  if (Date.now() > expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
}

// periodically clean up expired sessions
setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of sessions.entries()) {
    if (now > expiresAt) sessions.delete(token);
  }
}, 60 * 60 * 1000);

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function requireAuth(req, res, next) {
  if (isValidSession(req.cookies?.[SESSION_COOKIE])) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

function startWebServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

  // ----- Auth -----
  app.post('/api/login', (req, res) => {
    const { password } = req.body || {};
    if (!password || !timingSafeEqual(password, config.DASHBOARD_PASSWORD)) {
      return res.status(401).json({ ok: false, error: 'Wrong password' });
    }
    const token = createSession();
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: SESSION_TTL_MS
    });
    return res.json({ ok: true });
  });

  app.post('/api/logout', (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token) sessions.delete(token);
    res.clearCookie(SESSION_COOKIE);
    res.json({ ok: true });
  });

  // ----- Connection status / QR / Pair -----
  app.get('/api/status', requireAuth, (req, res) => {
    res.json({
      connection: state.connection,
      connected: state.connection === 'open',
      botNumber: state.sock?.user?.id?.split(':')[0] || null,
      botName: config.BOT_NAME,
      uptime: state.startedAt ? Date.now() - state.startedAt : 0,
      lastError: state.lastError
    });
  });

  app.get('/api/qr', requireAuth, (req, res) => {
    res.json({ qr: state.qrDataURL });
  });

  app.post('/api/pair', requireAuth, (req, res) => {
    const { phone } = req.body;
    if (!phone || phone.replace(/[^0-9]/g, '').length < 8) {
      return res.status(400).json({ error: 'Invalid phone number. Include country code, digits only.' });
    }
    if (!state.sock) return res.status(503).json({ error: 'Bot is still starting up, please wait a few seconds and retry.' });
    state.requestPair(phone.replace(/[^0-9]/g, ''));
    res.json({ ok: true });
  });

  app.get('/api/pair/result', requireAuth, (req, res) => {
    res.json({ code: state.pairingCode, error: state.pairingError });
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
