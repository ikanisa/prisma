import { MemoryCacheAdapter } from './memoryAdapter';
import { RedisCacheAdapter } from './redisAdapter';
import { getCacheTtlSeconds, getDefaultTtlSeconds, isCachingEnabled } from './config';
import type { CacheClient, CacheKey, CacheSetOptions } from './types';

let singleton: CacheClient | null | undefined;

function resolveRedisUrl(): string | null {
  return process.env.CACHE_REDIS_URL ?? process.env.REDIS_URL ?? null;
}

function resolveKeyPrefix(): string {
  return process.env.CACHE_KEY_PREFIX ?? 'cache:';
}

function createClient(): CacheClient | null {
  if (!isCachingEnabled()) {
    return null;
  }
  const defaultTtlSeconds = getDefaultTtlSeconds();
  const redisUrl = resolveRedisUrl();
  if (redisUrl) {
    return new RedisCacheAdapter({
      url: redisUrl,
      keyPrefix: resolveKeyPrefix(),
      defaultTtlSeconds,
    });
  }
  return new MemoryCacheAdapter({ defaultTtlSeconds });
}

export function getCacheClient(): CacheClient | null {
  if (singleton === undefined) {
    singleton = createClient();
  }
  return singleton ?? null;
}

export function setCacheClient(client: CacheClient | null): void {
  singleton = client;
}

export async function getOrSet<T>(
  key: CacheKey,
  resolver: () => Promise<T>,
  options?: CacheSetOptions & { client?: CacheClient | null; skipCache?: boolean },
): Promise<T> {
  const client = options?.client ?? getCacheClient();
  const ttlSeconds = options?.ttlSeconds;
  if (!client || options?.skipCache) {
    return resolver();
  }

  const cached = await client.get<T>(key);
  if (cached !== undefined) {
    return cached;
  }

  const value = await resolver();
  if (value !== undefined) {
    await client.set(key, value, { ttlSeconds });
  }
  return value;
}

export function buildCacheKey(parts: Array<string | number | boolean | null | undefined>): CacheKey {
  return parts
    .map((part) => {
      if (part === null || part === undefined) {
        return '∅';
      }
      if (typeof part === 'boolean') {
        return part ? '1' : '0';
      }
      return String(part).replace(/\s+/g, '_');
    })
    .join(':');
}

export { getCacheTtlSeconds };
export type { CacheClient, CacheKey, CacheSetOptions };
