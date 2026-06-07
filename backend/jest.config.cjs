const path = require('path');

module.exports = {
  testEnvironment: 'node',
  rootDir: __dirname,
  roots: ['<rootDir>/tests'],
  testMatch: ['**/tests/**/*.test.js'],
  coverageDirectory: 'coverage',
  testTimeout: 60000,
  // Use jest-runtime in ESM mode — requires --experimental-vm-modules
  // All transforms disabled: native ESM imports work as-is
  transform: {},
  // Mock ioredis and nodemailer via __mocks__
  moduleNameMapper: {
    '^ioredis$': '<rootDir>/__mocks__/ioredis.cjs',
    '^nodemailer$': '<rootDir>/__mocks__/nodemailer.cjs',
    '^bson$': '<rootDir>/node_modules/mongoose/node_modules/bson/lib/bson.cjs',
  },
  resolver: path.join(__dirname, 'jest.resolver.cjs'),
};
