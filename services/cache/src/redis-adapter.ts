import Redis, { type RedisOptions } from 'ioredis';
import type { CacheClient, CacheClientSetOptions } from './types.js';

interface RedisCacheClientOptions {
  url?: string;
  client?: Redis;
  keyPrefix?: string;
  redisOptions?: RedisOptions;
}

const isPositiveNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export class RedisCacheClient implements CacheClient {
  private readonly redis: Redis;
  private readonly keyPrefix: string;
  private ownsConnection: boolean;

  constructor(options: RedisCacheClientOptions) {
    if (!options.client && !options.url) {
      throw new Error('RedisCacheClient requires either a client or url');
    }

    this.keyPrefix = options.keyPrefix ?? 'cache';

    if (options.client) {
      this.redis = options.client;
      this.ownsConnection = false;
    } else {
      this.redis = new Redis(options.url!, {
        enableAutoPipelining: true,
        maxRetriesPerRequest: 2,
        lazyConnect: true,
        ...options.redisOptions,
      });
      this.ownsConnection = true;
    }
  }

  private prefix(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }

  async get(key: string): Promise<string | null> {
    const resolvedKey = this.prefix(key);
    return this.redis.get(resolvedKey);
  }

  async set(key: string, value: string, options?: CacheClientSetOptions): Promise<void> {
    const resolvedKey = this.prefix(key);
    const ttlSeconds = options?.ttlSeconds;

    if (isPositiveNumber(ttlSeconds)) {
      await this.redis.set(resolvedKey, value, 'EX', ttlSeconds);
      return;
    }

    await this.redis.set(resolvedKey, value);
  }

  async del(keys: string | string[]): Promise<void> {
    const resolvedKeys = Array.isArray(keys) ? keys : [keys];
    if (resolvedKeys.length === 0) {
      return;
    }
    const prefixedKeys = resolvedKeys.map((key) => this.prefix(key));
    await this.redis.del(...prefixedKeys);
  }

  async ttl(key: string): Promise<number | null> {
    const resolvedKey = this.prefix(key);
    const ttl = await this.redis.ttl(resolvedKey);
    if (ttl === -2) {
      return null;
    }
    if (ttl < 0) {
      return null;
    }
    return ttl;
  }

  async disconnect(): Promise<void> {
    if (!this.ownsConnection) {
      return;
    }
    await this.redis.quit();
  }
}

export const createRedisCacheClient = (options: RedisCacheClientOptions): RedisCacheClient => {
  return new RedisCacheClient(options);
};
