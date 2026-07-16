/**
 * Loads every plugin file inside /plugins.
 * Each plugin file must export an object:
 * {
 *   name: 'ping',
 *   command: ['ping', 'p'],       // array of trigger words (without prefix)
 *   category: 'general',
 *   description: 'short description shown in menu',
 *   ownerOnly: false,             // optional - restrict to bot owner
 *   adminOnly: false,             // optional - restrict to group admins
 *   groupOnly: false,             // optional - only works inside groups
 *   privateOnly: false,           // optional - only works in DM
 *   execute: async (sock, m, args, ctx) => { ... }   // the handler itself
 * }
 *
 * To add a NEW plugin: just drop a new .js file inside /plugins following the
 * same structure above — no need to edit this file or index.js.
 */
const fs = require('fs');
const path = require('path');

function loadPlugins() {
  const pluginsDir = path.join(__dirname, '..', 'plugins');
  const commandMap = new Map(); // command alias -> plugin
  const allPlugins = [];

  const files = fs.readdirSync(pluginsDir).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    try {
      delete require.cache[require.resolve(path.join(pluginsDir, file))];
      const plugin = require(path.join(pluginsDir, file));

      if (!plugin || !plugin.command || !plugin.execute) {
        console.warn(`⚠️  Skipping invalid plugin file: ${file}`);
        continue;
      }

      allPlugins.push(plugin);
      const commands = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
      for (const cmd of commands) {
        commandMap.set(cmd.toLowerCase(), plugin);
      }
    } catch (err) {
      console.error(`❌ Failed to load plugin "${file}":`, err.message);
    }
  }

  console.log(`🔌 Loaded ${allPlugins.length} plugins (${commandMap.size} commands)`);
  return { commandMap, allPlugins };
}

module.exports = { loadPlugins };
