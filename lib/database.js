const mongoose = require('mongoose');
const config = require('../config');

// ---------- Connect ----------
async function connectDB() {
  if (!config.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in environment variables (.env)');
    process.exit(1);
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.MONGODB_URI);
  console.log('✅ MongoDB connected');
}

// ---------- Settings Schema (one document per bot/session) ----------
const settingsSchema = new mongoose.Schema({
  sessionId: { type: String, unique: true, default: config.SESSION_ID },
  botName: { type: String, default: config.BOT_NAME },
  prefix: { type: String, default: config.PREFIX },
  mode: { type: String, enum: ['public', 'private'], default: config.BOT_MODE },
  ownerNumbers: { type: [String], default: [config.OWNER_NUMBER] },
  supportNumber: { type: String, default: config.SUPPORT_NUMBER },

  antidelete: { type: Boolean, default: true },
  antiviewonce: { type: Boolean, default: true },

  autoStatusView: { type: Boolean, default: false },
  autoStatusReact: { type: Boolean, default: false },

  autoforward: {
    enabled: { type: Boolean, default: false },
    // list of source jids to watch (empty = watch all chats bot is part of)
    sources: { type: [String], default: [] },
    // list of destination group/user jids to forward to
    targets: { type: [String], default: [] },
    // strip forwarded tag / newsletter tag / ad context to make message look original
    makeOriginal: { type: Boolean, default: true }
  },

  welcome: { type: Boolean, default: true },
  goodbye: { type: Boolean, default: true }
}, { timestamps: true });

const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);

// ---------- Group Schema ----------
const groupSchema = new mongoose.Schema({
  jid: { type: String, unique: true },
  name: String,
  muted: { type: Boolean, default: false }, // only admins can use bot commands
  antilink: { type: Boolean, default: false },
  welcome: { type: Boolean, default: true },
  isAutoForwardTarget: { type: Boolean, default: false }
}, { timestamps: true });

const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);

// ---------- User Schema ----------
const userSchema = new mongoose.Schema({
  jid: { type: String, unique: true },
  name: String,
  banned: { type: Boolean, default: false },
  warns: { type: Number, default: 0 },
  isAdmin: { type: Boolean, default: false } // bot-level admin (not group admin)
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// ---------- Helper: get (or create) settings doc ----------
async function getSettings() {
  let settings = await Settings.findOne({ sessionId: config.SESSION_ID });
  if (!settings) {
    settings = await Settings.create({ sessionId: config.SESSION_ID });
  }
  return settings;
}

module.exports = { connectDB, Settings, Group, User, getSettings };
