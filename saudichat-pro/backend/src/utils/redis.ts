import Redis from 'ioredis';

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!client) {
    client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 5000,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
    });
    client.on('error', (err) => console.error('[redis] connection error:', err.message));
  }
  return client;
}

export function tenantKey(businessId: string, ...parts: string[]): string {
  return `biz:${businessId}:${parts.join(':')}`;
}

async function withRedisTimeout<T>(fn: () => Promise<T>, fallback: T, ms = 4000): Promise<T> {
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('redis timeout')), ms)),
    ]);
  } catch {
    return fallback;
  }
}

export async function redisGet(key: string): Promise<string | null> {
  return withRedisTimeout(async () => {
    const redis = getRedis();
    if (!redis) return null;
    if (redis.status !== 'ready') await redis.connect();
    return redis.get(key);
  }, null);
}

export async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  await withRedisTimeout(async () => {
    const redis = getRedis();
    if (!redis) return;
    if (redis.status !== 'ready') await redis.connect();
    if (ttlSeconds) {
      await redis.set(key, value, 'EX', ttlSeconds);
    } else {
      await redis.set(key, value);
    }
  }, undefined);
}

export async function redisIncr(key: string, ttlSeconds?: number): Promise<number> {
  return withRedisTimeout(async () => {
    const redis = getRedis();
    if (!redis) return 0;
    if (redis.status !== 'ready') await redis.connect();
    const val = await redis.incr(key);
    if (ttlSeconds && val === 1) await redis.expire(key, ttlSeconds);
    return val;
  }, 0);
}

export async function redisDelPattern(businessId: string, patternSuffix: string): Promise<void> {
  await withRedisTimeout(async () => {
    const redis = getRedis();
    if (!redis) return;
    if (redis.status !== 'ready') await redis.connect();
    const match = `biz:${businessId}:${patternSuffix}`;
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', match, 'COUNT', 100);
      cursor = next;
      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== '0');
  }, undefined);
}

export async function redisExists(key: string): Promise<boolean> {
  return withRedisTimeout(async () => {
    const redis = getRedis();
    if (!redis) return false;
    if (redis.status !== 'ready') await redis.connect();
    return (await redis.exists(key)) === 1;
  }, false);
}
