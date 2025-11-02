import { createCacheKey } from './key.js';
import { jsonSerializer } from './serialization.js';
import type {
  CacheClient,
  CacheInvalidateOptions,
  CacheKeySegment,
  CacheManagerOptions,
  CacheSerializer,
  CacheWithLoaderOptions,
} from './types.js';

const isPositiveNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export class CacheManager {
  private readonly client: CacheClient;
  private readonly keyPrefix: string;
  private readonly defaultSerializer: CacheSerializer<unknown>;
  private readonly defaultTtlSeconds: number | null;

  constructor(options: CacheManagerOptions) {
    this.client = options.client;
    this.keyPrefix = options.keyPrefix ?? 'cache';
    this.defaultSerializer = options.defaultSerializer ?? jsonSerializer;
    this.defaultTtlSeconds = options.defaultTtlSeconds ?? null;
  }

  private buildKey(segments: CacheKeySegment[]): string {
    return createCacheKey(this.keyPrefix, segments);
  }

  async get<T>(segments: CacheKeySegment[], serializer?: CacheSerializer<T>): Promise<T | null> {
    const key = this.buildKey(segments);
    const payload = await this.client.get(key);
    if (payload === null) {
      return null;
    }
    const resolvedSerializer = (serializer ?? (this.defaultSerializer as CacheSerializer<T>))!;
    return resolvedSerializer.deserialize(payload);
  }

  async set<T>(
    segments: CacheKeySegment[],
    value: T,
    options?: { serializer?: CacheSerializer<T>; ttlSeconds?: number | null },
  ): Promise<void> {
    const ttlSeconds = options?.ttlSeconds ?? this.defaultTtlSeconds;
    if (!isPositiveNumber(ttlSeconds)) {
      return;
    }
    const resolvedSerializer = (options?.serializer ?? (this.defaultSerializer as CacheSerializer<T>))!;
    const payload = resolvedSerializer.serialize(value);
    const key = this.buildKey(segments);
    await this.client.set(key, payload, { ttlSeconds });
  }

  async withCache<T>(options: CacheWithLoaderOptions<T>): Promise<T> {
    const resolvedSerializer = (options.serializer ?? (this.defaultSerializer as CacheSerializer<T>))!;
    const ttlSeconds = options.ttlSeconds ?? this.defaultTtlSeconds;

    if (!options.skipCache && isPositiveNumber(ttlSeconds)) {
      const cached = await this.get<T>(options.key, resolvedSerializer);
      if (cached !== null) {
        return cached;
      }
    }

    const value = await options.loader();

    if (!options.skipCache && isPositiveNumber(ttlSeconds)) {
      await this.set(options.key, value, { serializer: resolvedSerializer, ttlSeconds });
    }

    return value;
  }

  async invalidate(options: CacheInvalidateOptions): Promise<void> {
    const key = this.buildKey(options.key);
    await this.client.del(key);
  }

  async ttl(segments: CacheKeySegment[]): Promise<number | null> {
    const key = this.buildKey(segments);
    return this.client.ttl(key);
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }
}
