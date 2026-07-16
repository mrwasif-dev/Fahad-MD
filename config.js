require('dotenv').config();

module.exports = {
  MONGODB_URI: process.env.MONGODB_URI || '',
  PORT: process.env.PORT || 3000,
  DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD || 'admin123',
  OWNER_NUMBER: (process.env.OWNER_NUMBER || '923014875344').replace(/[^0-9]/g, ''),
  SUPPORT_NUMBER: process.env.SUPPORT_NUMBER || '03014875344',
  BOT_NAME: process.env.BOT_NAME || 'FAHAD MD',
  PREFIX: process.env.PREFIX || '.',
  SESSION_ID: process.env.SESSION_ID || 'fahad-md-main',
  BOT_MODE: process.env.BOT_MODE || 'public'
};
