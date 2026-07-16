module.exports = {
  name: 'ping',
  command: ['ping'],
  category: 'general',
  description: 'Check bot response speed',
  execute: async (sock, m) => {
    const start = Date.now();
    const sent = await m.reply('🏓 Pinging...');
    const speed = Date.now() - start;
    await sock.sendMessage(m.chat, { text: `🏓 Pong! *${speed}ms*`, edit: sent.key });
  }
};
