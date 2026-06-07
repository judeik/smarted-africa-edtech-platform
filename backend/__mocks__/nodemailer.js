const nodemailerMock = {
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(async () => ({ messageId: 'mock-msg-id' })),
  })),
};
module.exports = nodemailerMock;
