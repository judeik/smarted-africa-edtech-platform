const store = new Map();
const RedisMock = jest.fn().mockImplementation(() => ({
  set: jest.fn(async (k, v) => { store.set(k, v); return 'OK'; }),
  get: jest.fn(async (k) => store.get(k) ?? null),
  del: jest.fn(async (k) => { store.delete(k); return 1; }),
  call: jest.fn(async () => null),
  on: jest.fn(),
  quit: jest.fn(async () => 'OK'),
}));
module.exports = RedisMock;
