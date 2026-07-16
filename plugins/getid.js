module.exports = {
  name: 'getid',
  command: ['getid'],
  category: 'general',
  description: 'Get the JID of the current chat (useful for auto-forward source/target setup)',
  execute: async (sock, m) => {
    return m.reply(`🆔 Chat JID:\n${m.chat}`);
  }
};
