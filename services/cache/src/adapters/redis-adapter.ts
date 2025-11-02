import type { Redis as RedisClient } from 'ioredis'
import { jsonSerializer } from '../serialization.js'
import type { CacheClient, CacheSerializer, CacheSetOptions } from '../types.js'

export interface RedisCacheOptions {
  namespace?: string
  separator?: string
  serializer?: CacheSerializer
  manageClient?: boolean
}

export class RedisCacheClient implements CacheClient {
  private readonly client: RedisClient
  private readonly namespace: string
  private readonly separator: string
  private readonly serializer: CacheSerializer
  private readonly manageClient: boolean

  constructor(client: RedisClient, options: RedisCacheOptions = {}) {
    this.client = client
    this.namespace = options.namespace ?? 'cache'
    this.separator = options.separator ?? ':'
    this.serializer = options.serializer ?? jsonSerializer
    this.manageClient = options.manageClient ?? false
  }

  async get<T>(key: string): Promise<T | null> {
    const payload = await this.client.get(this.scopedKey(key))
    if (payload === null) {
      return null
    }

    try {
      return this.serializer.deserialize<T>(payload)
    } catch {
      return null
    }
  }

  async set<T>(key: string, value: T, options: CacheSetOptions = {}): Promise<void> {
    const payload = this.serializer.serialize(value)
    const ttlSeconds = options.ttlSeconds ?? 0
    const scoped = this.scopedKey(key)
    if (ttlSeconds > 0) {
      await this.client.set(scoped, payload, 'EX', ttlSeconds)
    } else {
      await this.client.set(scoped, payload)
    }
  }

  async del(key: string): Promise<number> {
    return this.client.del(this.scopedKey(key))
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(this.scopedKey(key))
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    const pattern = `${this.scopedKey(prefix)}*`
    let cursor = '0'
    let deleted = 0

    do {
      const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
      if (keys.length > 0) {
        deleted += await this.client.del(...keys)
      }
      cursor = nextCursor
    } while (cursor !== '0')

    return deleted
  }

  async close(): Promise<void> {
    if (this.manageClient) {
      try {
        await this.client.quit()
      } catch {
        await this.client.disconnect()
      }
    }
  }

  private scopedKey(key: string): string {
    if (!this.namespace) {
      return key
    }
    if (!key) {
      return this.namespace
    }
    return `${this.namespace}${this.separator}${key}`
  }
}
