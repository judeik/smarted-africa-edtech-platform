import Redis from 'ioredis';
import env from './env.js';

const redis = new Redis({
  host: env.redisHost,
  port: env.redisPort,
  password: env.redisPassword,
  retryStrategy: (times) => Math.min(times * 500, 5000),
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => console.log('[redis] Connected'));
redis.on('error', (e) => console.error('[redis] Error:', e.message));

export default redis;
