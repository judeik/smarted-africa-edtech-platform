const store = new Map();
function RedisMock() {
  return {
    set: async (k, v) => { store.set(k, v); return 'OK'; },
    get: async (k) => store.get(k) ?? null,
    del: async (k) => { store.delete(k); return 1; },
    call: async () => null,
    on: () => {},
    quit: async () => 'OK',
  };
}
module.exports = RedisMock;
