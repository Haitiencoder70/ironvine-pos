import { createClient, RedisClientType } from 'redis';
import { logger } from '../lib/logger';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

let client: RedisClientType | null = null;
let connected = false;

async function getClient(): Promise<RedisClientType | null> {
  if (connected) return client;
  if (client) return null; // connection in progress or failed

  try {
    client = createClient({ url: REDIS_URL }) as RedisClientType;

    client.on('error', (err: Error) => {
      logger.warn('Redis client error — cache disabled', { error: err.message });
      connected = false;
    });

    client.on('reconnecting', () => {
      connected = false;
    });

    await client.connect();
    connected = true;
    logger.info('Redis connected', { url: REDIS_URL });
  } catch (err) {
    logger.warn('Redis unavailable — running without cache', { error: (err as Error).message });
    client = null;
    connected = false;
  }

  return connected ? client : null;
}

// Initialize connection at startup (non-blocking)
void getClient();

export const cacheService = {
  async get<T>(key: string): Promise<T | null> {
    const redis = await getClient();
    if (!redis) return null;

    try {
      const raw = await redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      logger.warn('Cache get failed', { key, error: (err as Error).message });
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    const redis = await getClient();
    if (!redis) return;

    try {
      await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch (err) {
      logger.warn('Cache set failed', { key, error: (err as Error).message });
    }
  },

  async invalidate(pattern: string): Promise<void> {
    const redis = await getClient();
    if (!redis) return;

    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (err) {
      logger.warn('Cache invalidate failed', { pattern, error: (err as Error).message });
    }
  },

  async invalidateOrganization(organizationId: string): Promise<void> {
    await this.invalidate(`org:*:${organizationId}*`);
    await this.invalidate(`org:subdomain:*`); // subdomain → org map entries
  },
};
