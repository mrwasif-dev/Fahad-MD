module.exports = {
  name: 'ping',
  command: ['ping'],
  category: 'general',
  description: 'Check bot response speed',
  execute: async (sock, m) => {
    const start = Date.now();
    await sock.sendMessage(m.chat, { text: '🏓 Pinging...' }, { quoted: m.raw });
    const speed = Date.now() - start;
    await m.reply(`🏓 Pong! *${speed}ms*`);
  }
};
