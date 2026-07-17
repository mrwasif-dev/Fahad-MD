# 🤖 FAHAD MD — Professional WhatsApp Bot

A full-featured, production-ready WhatsApp bot built on **Baileys** (multi-device API), with **MongoDB session persistence**, a **web dashboard** for QR/Pairing-code linking and live configuration, a clean **plugin architecture**, and an **auto-forward engine** that strips forwarding/newsletter metadata so forwarded content looks original.

**Support:** 03014875344

---

## ✨ Key Features

| Category | Features |
|---|---|
| **Session** | MongoDB-backed auth state — session survives Heroku restarts/redeploys |
| **Linking** | Both **QR Code** and **Pairing Code** supported, switchable from the dashboard |
| **Dashboard** | Public web URL: link device, toggle bot mode, security features, and auto-forward — no code editing required |
| **Group Management** | kick, add, promote, demote, mute, unmute, tagall, invite link, revoke link, setname, setdesc |
| **User Management** | ban, unban, warn, unwarn, profile, banlist |
| **Security** | Anti-Delete (recovers deleted messages), Anti-ViewOnce (saves view-once media) |
| **Status Tools** | Auto status view, auto status react, save status/media |
| **Forwarding** | Manual `.forward` command + fully automatic **Auto-Forward** engine with configurable source/target chats |
| **Originality Engine** | Every forwarded message is stripped of "Forwarded", newsletter/channel tags, and ad context before being re-sent |
| **Modes** | Public (anyone can use commands) / Private (owner only) |
| **Plugins** | Drop a single `.js` file into `/plugins` — it's auto-loaded, no core file editing needed |

---

## 📁 Project Structure

```
fahad-md/
├── index.js                  # Entry point — connects to WhatsApp, dispatches messages
├── config.js                 # Central configuration (reads .env)
├── package.json
├── Procfile                  # Heroku process definition
├── app.json                  # Heroku one-click deploy config
├── .env.example
├── lib/
│   ├── database.js           # MongoDB models: Settings, Group, User
│   ├── mongoAuthState.js     # WhatsApp auth/session stored in MongoDB
│   ├── pluginHandler.js      # Automatic plugin loader
│   ├── serialize.js          # Raw Baileys message → clean "m" object
│   └── state.js               # Shared runtime state (QR, pairing code, connection)
├── plugins/                  # 👉 Every command lives here, one file per feature
│   ├── ping.js
│   ├── menu.js
│   ├── group.js
│   ├── user.js
│   ├── status.js
│   ├── antidelete.js
│   ├── antiviewonce.js
│   ├── mode.js
│   ├── forward.js
│   ├── autoforward.js
│   ├── getid.js
│   └── alive.js
├── utils/
│   └── originalizer.js        # Strips forwarding/newsletter metadata for "original" resend
└── web/
    ├── server.js               # Express dashboard API
    └── public/                 # Dashboard HTML/CSS/JS
```

---

## 🛠️ Local Setup

```bash
git clone https://github.com/YOUR_USERNAME/fahad-md.git
cd fahad-md
npm install
cp .env.example .env
# edit .env: set MONGODB_URI, OWNER_NUMBER, DASHBOARD_PASSWORD, etc.
npm start
```

Open `http://localhost:3000`, log in with your `DASHBOARD_PASSWORD`, go to **Link Device**, and either scan the QR code or request a pairing code.

---

## ☁️ MongoDB Atlas (Free Tier)

1. Create a free cluster at https://www.mongodb.com/cloud/atlas
2. Create a database user (username/password)
3. Under Network Access, allow `0.0.0.0/0` so Heroku can connect
4. Copy the connection string from **Connect → Drivers** — this is your `MONGODB_URI`

---

## 🚀 Deploy to Heroku

### Option A — One-Click Deploy Button
1. Push this project to your own GitHub repository
2. Update the `repository` field in `app.json` to point to your repo
3. Add this button to your repo's README:
```md
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/YOUR_USERNAME/fahad-md)
```
4. Click it, fill in the environment variables (`MONGODB_URI` is required), and deploy

### Option B — Heroku CLI
```bash
heroku login
heroku create fahad-md-bot
heroku config:set MONGODB_URI="your_mongodb_uri"
heroku config:set OWNER_NUMBER="923014875344"
heroku config:set DASHBOARD_PASSWORD="your_secure_password"
git push heroku main
heroku ps:scale web=1
heroku open
```

The URL Heroku gives you (`heroku open`) is your **public dashboard** — use it to link your device and manage all settings.

---

## 🧩 Adding a New Plugin

Create a new `.js` file inside `/plugins` following this exact structure:

```js
module.exports = {
  name: 'mycommand',
  command: ['mycommand', 'mc'],   // trigger words, without prefix
  category: 'general',
  description: 'What this command does',
  ownerOnly: false,      // optional: restrict to bot owner
  adminOnly: false,      // optional: restrict to group admins
  groupOnly: false,      // optional: only works in groups
  privateOnly: false,    // optional: only works in DMs
  execute: async (sock, m, args, ctx) => {
    // sock  → Baileys socket instance
    // m     → serialized message: m.chat, m.sender, m.body, m.reply(), m.react(), m.download()
    // args  → words after the command (array)
    // ctx   → { config, settings, isOwner, User, Group, allPlugins, commandMap }

    await m.reply('Hello from my new command!');
  }
};
```

Save the file — the plugin is picked up automatically on the next restart/deploy. No other file needs to be touched.

---

## 📜 Command Reference

| Command | Description |
|---|---|
| `.ping` | Check bot response speed |
| `.menu` / `.help` | List all available commands |
| `.alive` / `.owner` | Bot uptime and owner contact |
| `.getid` | Get the current chat's JID |
| `.kick` `.add` `.promote` `.demote` | Group member management |
| `.mute` `.unmute` | Restrict group to admins only |
| `.tagall <text>` | Mention all group members |
| `.link` `.revoke` | Group invite link management |
| `.setname` `.setdesc` | Update group name/description |
| `.ban` `.unban` `.warn` `.unwarn` | User management (owner only) |
| `.profile` `.banlist` | View user profile / banned users list |
| `.autostatus on/off` | Auto view WhatsApp statuses |
| `.statusreact on/off` | Auto react to statuses |
| `.save` (reply) | Save a status/media message |
| `.antidelete on/off` | Recover deleted messages |
| `.antiviewonce on/off` | Save view-once media |
| `.mode public/private` | Switch bot access mode |
| `.forward <number>` (reply) | Forward a message as original content |
| `.autoforward on/off` | Enable/disable the auto-forward engine |
| `.afsource add/remove <jid>` | Configure auto-forward source chats |
| `.aftarget add/remove <jid>` | Configure auto-forward target groups |

---

## ⚠️ Notes

- `OWNER_NUMBER` must be digits only with country code, e.g. `923014875344`
- Change the default `DASHBOARD_PASSWORD` before deploying. Login issues a real, random server-side session token (not the raw password) stored in an httpOnly cookie, valid for 7 days.
- QR codes and pairing codes come directly from a live Baileys connection to WhatsApp's servers — nothing is simulated. If a code doesn't appear, check `heroku logs --tail` (or your terminal) for the actual connection error, which is also shown live on the dashboard status badge.
- Respect WhatsApp's terms of service — avoid spam/bulk messaging abuse

---

**FAHAD MD** — Built for reliability, extensibility, and a clean professional experience.
Support: **03014875344**
