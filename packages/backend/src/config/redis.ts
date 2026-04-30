import { Redis } from 'ioredis';
import { config } from './index.js';

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;

  _redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  _redis.on('error', (err: Error) => {
    console.error('[Redis] Connection error:', err);
  });

  _redis.on('connect', () => {
    console.log('[Redis] Connected');
  });

  return _redis;
}

export async function disconnectRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
}
