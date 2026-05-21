import { createClient, RedisClientType } from 'redis';
import { logger } from '../lib/logger';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

let client: RedisClientType | null = null;

// Create the client once and let node-redis manage (re)connection in the
// background. A remote managed Redis (e.g. Upstash) needs a generous connect
// timeout, and must be allowed to reconnect after an idle disconnect.
function initRedis(): void {
  const c = createClient({
    url: REDIS_URL,
    socket: {
      connectTimeout: 10000,
      reconnectStrategy: (retries) =>
        retries > 10 ? false : Math.min(retries * 500, 5000),
    },
  }) as RedisClientType;

  c.on('ready', () => logger.info('Redis connected'));
  c.on('error', () => undefined); // suppress spam; reconnectStrategy handles recovery

  client = c;
  c.connect().catch((err) => {
    logger.warn('Redis unavailable — running without cache', {
      error: (err as Error).message,
    });
  });
}

initRedis();

// Usable only when connected and ready; null means "no cache", and every
// caller already treats null as "skip the cache and continue".
function getClient(): RedisClientType | null {
  return client !== null && client.isReady ? client : null;
}

export const cacheService = {
  async get<T>(key: string): Promise<T | null> {
    const redis = getClient();
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
    const redis = getClient();
    if (!redis) return;

    try {
      await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch (err) {
      logger.warn('Cache set failed', { key, error: (err as Error).message });
    }
  },

  async invalidate(pattern: string): Promise<void> {
    const redis = getClient();
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
