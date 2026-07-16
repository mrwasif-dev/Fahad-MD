# 🤖 FAHAD MD — WhatsApp Bot

Baileys پر مبنی مکمل پروفیشنل WhatsApp بوٹ — MongoDB سیشن اسٹور، QR + Pair Code لنکنگ، ویب ڈیش بورڈ، پلگ ان سسٹم، آٹو فارورڈ (اوریجنل موڈ)، گروپ/یوزر/اسٹیٹس منیجمنٹ کے ساتھ۔

**Support:** 03014875344

---

## ✨ Features

- 🔗 **QR Code + Pairing Code** دونوں سے device link کر سکتے ہیں (ویب ڈیش بورڈ سے)
- 🗄️ **MongoDB Session Store** — Heroku restart/redeploy پر بھی سیشن ضائع نہیں ہوتا
- 🌐 **Web Dashboard** — پبلک URL کھول کر لاگ ان کریں اور:
  - Device link کریں (QR یا Pair)
  - Bot mode (Public/Private) تبدیل کریں
  - Anti-Delete, Anti-ViewOnce, Auto Status View/React on/off کریں
  - Auto-Forward کے source/target groups سیٹ کریں
- 👥 **Group Management** — kick, add, promote, demote, mute, unmute, tagall, link, revoke, setname, setdesc
- 👤 **User Management** — ban, unban, warn, unwarn, profile, banlist
- 📵 **Anti-Delete** — delete شدہ میسج owner کو واپس بھیج دیتا ہے
- 👁️ **Anti-ViewOnce** — view once میڈیا محفوظ کر کے owner کو بھیجتا ہے
- 📊 **Status Management** — auto status view, auto status react, status save
- ↪️ **Forward Command** — reply کر کے کسی بھی میسج کو "اوریجنل" بنا کر فارورڈ کریں (forwarded tag / newsletter tag ہٹا کر)
- 🔁 **Auto-Forward System** — مقرر کردہ source سے ہر نیا میسج target group(s) میں خودکار، اوریجنل بنا کر فارورڈ ہو جاتا ہے
- 🔒 **Public / Private Mode**
- 🧩 **Plugin System** — ہر کمانڈ اپنی الگ فائل میں، نئی فائل ڈالتے ہی خودکار لوڈ ہو جاتی ہے
- 🏓 Ping, Menu, Alive, GetID اور مزید

---

## 📁 Folder Structure

```
fahad-md/
├── index.js                 # Main entry (bot connect + message handler)
├── config.js                 # Central config (env variables)
├── package.json
├── Procfile                   # Heroku process file
├── app.json                   # Heroku one-click deploy config
├── .env.example
├── lib/
│   ├── database.js            # MongoDB models (Settings, Group, User)
│   ├── mongoAuthState.js       # WhatsApp session stored in MongoDB
│   ├── pluginHandler.js        # Auto plugin loader
│   ├── serialize.js            # Message parser helper
│   └── state.js                # Shared runtime state (QR, pair code, etc.)
├── plugins/                   # 👉 Har command yahan, apni alag file mein
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
│   └── originalizer.js         # Forward tag/newsletter tag remove karne wala helper
└── web/
    ├── server.js                # Express dashboard server
    └── public/                  # Dashboard HTML/CSS/JS
```

---

## 🛠️ Setup (Local)

```bash
git clone https://github.com/YOUR_USERNAME/fahad-md.git
cd fahad-md
npm install
cp .env.example .env
# .env file khol kar apni MONGODB_URI, OWNER_NUMBER waghera bharein
npm start
```

Terminal میں آپ کو dashboard کا لنک نظر آئے گا:
```
🌐 Dashboard running on port 3000
```
اپنے browser میں `http://localhost:3000` کھولیں → Dashboard password (`.env` میں `DASHBOARD_PASSWORD`) سے لاگ ان کریں → **Link Device** tab میں جا کر QR سکین کریں یا Pair Code لیں۔

---

## ☁️ MongoDB Atlas Setup (Free)

1. https://www.mongodb.com/cloud/atlas پر جا کر free account بنائیں
2. ایک نیا Cluster بنائیں (Free M0 tier)
3. Database Access میں ایک user بنائیں (username/password)
4. Network Access میں `0.0.0.0/0` allow کریں (تاکہ Heroku access کر سکے)
5. "Connect" → "Drivers" سے connection string کاپی کریں، یہ آپ کا `MONGODB_URI` ہے

---

## 🚀 Deploy on Heroku

### Option A — Heroku Button (سب سے آسان)
1. کوڈ کو اپنے GitHub اکاؤنٹ پر push کریں
2. `app.json` میں `repository` والی line اپنے GitHub repo کے لنک سے بدل دیں
3. اپنے GitHub repo کے README میں یہ بٹن شامل کریں:
```md
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/YOUR_USERNAME/fahad-md)
```
4. بٹن پر کلک کریں → Environment variables بھریں (`MONGODB_URI` لازمی) → Deploy

### Option B — Heroku CLI
```bash
heroku login
heroku create fahad-md-bot
heroku config:set MONGODB_URI="your_mongodb_uri"
heroku config:set OWNER_NUMBER="923014875344"
heroku config:set DASHBOARD_PASSWORD="your_password"
git push heroku main
heroku ps:scale web=1
heroku open
```

Deploy کے بعد `heroku open` سے ملنے والا URL ہی آپ کا **public dashboard URL** ہے — یہیں سے device link کریں اور settings بدلیں۔

---

## 🧩 نیا Plugin کیسے شامل کریں

`plugins/` فولڈر میں ایک نئی `.js` فائل بنائیں، یہ pattern follow کریں:

```js
module.exports = {
  name: 'mycommand',
  command: ['mycommand', 'mc'],   // trigger words (prefix ke baghair)
  category: 'general',
  description: 'What this command does',
  ownerOnly: false,     // optional
  adminOnly: false,     // optional (group admins only)
  groupOnly: false,     // optional
  privateOnly: false,   // optional
  execute: async (sock, m, args, ctx) => {
    // sock  = Baileys socket
    // m     = serialized message (m.chat, m.sender, m.body, m.reply(), etc.)
    // args  = command ke baad ke words (array)
    // ctx   = { config, settings, isOwner, User, Group, allPlugins, commandMap }

    await m.reply('Hello from my new command!');
  }
};
```

بس! فائل save کریں، bot دوبارہ اسٹارٹ ہو گا (یا اگلی deploy پر) اور آپ کی کمانڈ خودکار لوڈ ہو جائے گی — کسی اور فائل میں کچھ لکھنے کی ضرورت نہیں۔

---

## 📜 Commands List

| Command | تفصیل |
|---|---|
| `.ping` | Bot response speed چیک کریں |
| `.menu` / `.help` | تمام کمانڈز کی لسٹ |
| `.alive` / `.owner` | Bot status اور owner contact |
| `.getid` | موجودہ چیٹ کا JID |
| `.kick` `.add` `.promote` `.demote` | گروپ ممبر منیجمنٹ |
| `.mute` `.unmute` | گروپ کو صرف ایڈمن کے لیے محدود کریں |
| `.tagall <text>` | تمام ممبرز کو mention کریں |
| `.link` `.revoke` | گروپ invite link |
| `.setname` `.setdesc` | گروپ نام/تفصیل تبدیل کریں |
| `.ban` `.unban` `.warn` `.unwarn` | یوزر منیجمنٹ (owner only) |
| `.profile` `.banlist` | یوزر پروفائل / بین لسٹ |
| `.autostatus on/off` | اسٹیٹس آٹو ویو |
| `.statusreact on/off` | اسٹیٹس آٹو ری ایکٹ |
| `.save` (reply) | اسٹیٹس/میڈیا محفوظ کریں |
| `.antidelete on/off` | ڈیلیٹ شدہ میسج واپس بھیجیں |
| `.antiviewonce on/off` | ویو ون میڈیا محفوظ کریں |
| `.mode public/private` | بوٹ موڈ تبدیل کریں |
| `.forward <number>` (reply) | میسج کو اوریجنل بنا کر فارورڈ کریں |
| `.autoforward on/off` | آٹو فارورڈ آن/آف |
| `.afsource add/remove <jid>` | آٹو فارورڈ سورس چیٹ سیٹ کریں |
| `.aftarget add/remove <jid>` | آٹو فارورڈ ٹارگٹ گروپ سیٹ کریں |

---

## ⚠️ Notes

- `OWNER_NUMBER` میں country code سمیت صرف نمبر لکھیں، جیسے `923014875344`
- Dashboard password تبدیل کرنا نہ بھولیں (`DASHBOARD_PASSWORD` env variable)
- WhatsApp کی policy کے مطابق بلک میسجنگ/اسپیم سے پرہیز کریں

---

Made with ❤️ — **FAHAD MD**
Support: **03014875344**
