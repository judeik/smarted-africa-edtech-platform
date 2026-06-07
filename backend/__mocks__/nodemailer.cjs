module.exports = {
  createTransport: () => ({
    sendMail: async () => ({ messageId: 'mock-msg-id' }),
  }),
};
