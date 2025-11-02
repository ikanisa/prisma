import { Redis as RedisConstructor } from 'ioredis'
import type { Redis as RedisClient } from 'ioredis'
import { MemoryCacheClient, type MemoryCacheOptions } from './adapters/memory-adapter.js'
import { RedisCacheClient, type RedisCacheOptions } from './adapters/redis-adapter.js'
import { jsonSerializer } from './serialization.js'
import type { CacheClient, CacheFactoryOptions } from './types.js'

export interface CreateCacheClientOptions extends CacheFactoryOptions {
  memory?: MemoryCacheOptions
  redis?: RedisCacheOptions
}

export async function createCacheClient(options: CreateCacheClientOptions = {}): Promise<CacheClient> {
  const adapter = options.adapter ?? 'auto'
  const namespace = options.namespace ?? 'cache'
  const separator = options.separator ?? ':'
  const serializer = options.serializer ?? jsonSerializer

  if (adapter === 'memory') {
    return new MemoryCacheClient({ namespace, separator, serializer, ...options.memory })
  }

  if (adapter === 'redis' || adapter === 'auto') {
    const redisUrl = options.redisUrl ?? process.env.REDIS_URL ?? ''
    const existingInstance: RedisClient | null = options.redisInstance ?? null

    if (redisUrl || existingInstance) {
      try {
        const client: RedisClient = existingInstance ?? new RedisConstructor(redisUrl, { lazyConnect: true })
        if (client.status === 'wait' || client.status === 'end') {
          await client.connect()
        }
        return new RedisCacheClient(client, {
          namespace,
          separator,
          serializer,
          manageClient: !existingInstance,
          ...options.redis,
        })
      } catch (error) {
        if (adapter === 'redis' || options.allowFallback === false) {
          throw error
        }
        console.warn('[cache] Falling back to in-memory cache:', error instanceof Error ? error.message : error)
      }
    } else if (adapter === 'redis' && options.allowFallback === false) {
      throw new Error('REDIS_URL must be provided when adapter is "redis"')
    }
  }

  return new MemoryCacheClient({ namespace, separator, serializer, ...options.memory })
}
