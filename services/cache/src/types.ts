import type { Redis as RedisClient } from 'ioredis'

export type CacheKey = string

export interface CacheSetOptions {
  /**
   * TTL in seconds. When omitted or set to a value <= 0 the entry will be stored without expiry.
   */
  ttlSeconds?: number
}

export interface CacheClient {
  get<T>(key: CacheKey): Promise<T | null>
  set<T>(key: CacheKey, value: T, options?: CacheSetOptions): Promise<void>
  del(key: CacheKey): Promise<number>
  ttl(key: CacheKey): Promise<number>
  deleteByPrefix(prefix: string): Promise<number>
  close(): Promise<void>
}

export interface CacheSerializer {
  serialize(value: unknown): string
  deserialize<T>(payload: string): T
}

export type CacheFactoryAdapter = 'auto' | 'redis' | 'memory'

export interface CacheFactoryOptions {
  namespace?: string
  separator?: string
  serializer?: CacheSerializer
  adapter?: CacheFactoryAdapter
  redisUrl?: string
  redisInstance?: RedisClient | null
  allowFallback?: boolean
}
