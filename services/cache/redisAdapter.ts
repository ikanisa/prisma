import Redis, { type RedisOptions } from 'ioredis';
import { deserializeValue, serializeValue } from './serialization';
import type { CacheClient, CacheKey, CacheSetOptions } from './types';

export type RedisCacheAdapterOptions = {
  url?: string;
  client?: Redis;
  keyPrefix?: string;
  defaultTtlSeconds?: number;
  redisOptions?: RedisOptions;
  logger?: { warn(message: string, meta?: Record<string, unknown>): void };
};

function ensureClient(options: RedisCacheAdapterOptions): Redis {
  if (options.client) {
    return options.client;
  }
  if (!options.url) {
    throw new Error('RedisCacheAdapter requires either a url or an existing client instance');
  }
  return new Redis(options.url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    ...options.redisOptions,
  });
}

export class RedisCacheAdapter implements CacheClient {
  private readonly client: Redis;
  private readonly defaultTtlSeconds?: number;
  private readonly keyPrefix: string;

  constructor(private readonly options: RedisCacheAdapterOptions) {
    this.client = ensureClient(options);
    this.defaultTtlSeconds = options.defaultTtlSeconds;
    this.keyPrefix = options.keyPrefix ?? 'cache:';

    this.client.on('error', (error) => {
      if (options.logger) {
        options.logger.warn('cache.redis_error', { error });
      }
    });
  }

  private namespaced(key: CacheKey): string {
    return `${this.keyPrefix}${key}`;
  }

  async get<T>(key: CacheKey): Promise<T | undefined> {
    const raw = await this.client.get(this.namespaced(key));
    return deserializeValue<T>(raw);
  }

  async set<T>(key: CacheKey, value: T, options?: CacheSetOptions): Promise<void> {
    const payload = serializeValue(value);
    const ttlSeconds = options?.ttlSeconds ?? this.defaultTtlSeconds ?? undefined;
    const namespaced = this.namespaced(key);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(namespaced, payload, 'EX', ttlSeconds);
      return;
    }
    await this.client.set(namespaced, payload);
  }

  async del(key: CacheKey | CacheKey[]): Promise<void> {
    if (Array.isArray(key)) {
      const keys = key.map((k) => this.namespaced(k));
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return;
    }
    await this.client.del(this.namespaced(key));
  }

  async ttl(key: CacheKey): Promise<number | null> {
    return this.client.ttl(this.namespaced(key));
  }

  async disconnect(): Promise<void> {
    if (!this.options.client) {
      await this.client.quit();
    }
  }
}
