import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redis from '../config/redis.js';

const isTest = process.env.NODE_ENV === 'test';

const makeStore = (prefix) => {
  if (isTest) return undefined; // Use in-memory store during tests
  try {
    return new RedisStore({
      sendCommand: (...args) => redis.call(...args),
      prefix,
    });
  } catch {
    return undefined;
  }
};

const limiterDefaults = {
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  passOnStoreError: true,
};

export const authLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many requests, please try again in 15 minutes.' },
  store: makeStore('rl:auth:'),
});

export const apiLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests from this IP.' },
  store: makeStore('rl:api:'),
});

export const aiLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'AI tutor rate limit reached. Please slow down.' },
  store: makeStore('rl:ai:'),
});
