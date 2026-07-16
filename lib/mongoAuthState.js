/**
 * Custom Baileys auth state adapter that stores creds + signal keys inside MongoDB
 * instead of local files. This lets FAHAD MD run on Heroku (ephemeral filesystem)
 * without losing the WhatsApp session on every restart/deploy.
 */
const mongoose = require('mongoose');
const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');

const authSchema = new mongoose.Schema({
  _id: { type: String },
  value: { type: mongoose.Schema.Types.Mixed }
}, { collection: 'auth_sessions', minimize: false });

const AuthModel = mongoose.models.AuthSession || mongoose.model('AuthSession', authSchema);

async function useMongoAuthState(sessionId) {
  const writeData = async (key, data) => {
    const value = JSON.parse(JSON.stringify(data, BufferJSON.replacer));
    await AuthModel.updateOne(
      { _id: `${sessionId}:${key}` },
      { $set: { value } },
      { upsert: true }
    );
  };

  const readData = async (key) => {
    try {
      const doc = await AuthModel.findById(`${sessionId}:${key}`).lean();
      if (!doc || !doc.value) return null;
      return JSON.parse(JSON.stringify(doc.value), BufferJSON.reviver);
    } catch (e) {
      return null;
    }
  };

  const removeData = async (key) => {
    try {
      await AuthModel.deleteOne({ _id: `${sessionId}:${key}` });
    } catch (e) {
      /* ignore */
    }
  };

  const creds = (await readData('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category of Object.keys(data)) {
            for (const id of Object.keys(data[category])) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(key, value) : removeData(key));
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: async () => {
      await writeData('creds', creds);
    },
    // Fully wipes this session from MongoDB (used when user wants to re-link device)
    clearSession: async () => {
      await AuthModel.deleteMany({ _id: { $regex: `^${sessionId}:` } });
    }
  };
}

module.exports = { useMongoAuthState };
