import NodeCache from 'node-cache'
import { jsonSerializer } from '../serialization.js'
import type { CacheClient, CacheSerializer, CacheSetOptions } from '../types.js'

export interface MemoryCacheOptions {
  namespace?: string
  separator?: string
  serializer?: CacheSerializer
}

export class MemoryCacheClient implements CacheClient {
  private readonly store: NodeCache
  private readonly namespace: string
  private readonly separator: string
  private readonly serializer: CacheSerializer

  constructor(options: MemoryCacheOptions = {}) {
    this.namespace = options.namespace ?? 'cache'
    this.separator = options.separator ?? ':'
    this.serializer = options.serializer ?? jsonSerializer
    this.store = new NodeCache({ stdTTL: 0, checkperiod: 120 })
  }

  async get<T>(key: string): Promise<T | null> {
    const value = this.store.get<string>(this.scopedKey(key))
    if (value === undefined) {
      return null
    }

    try {
      return this.serializer.deserialize<T>(value)
    } catch {
      return null
    }
  }

  async set<T>(key: string, value: T, options: CacheSetOptions = {}): Promise<void> {
    const payload = this.serializer.serialize(value)
    const ttlSeconds = options.ttlSeconds ?? 0
    if (ttlSeconds > 0) {
      this.store.set(this.scopedKey(key), payload, ttlSeconds)
    } else {
      this.store.set(this.scopedKey(key), payload)
    }
  }

  async del(key: string): Promise<number> {
    return this.store.del(this.scopedKey(key))
  }

  async ttl(key: string): Promise<number> {
    const ttl = this.store.getTtl(this.scopedKey(key))
    if (!ttl) {
      return -1
    }

    const expiresInMs = ttl - Date.now()
    return expiresInMs > 0 ? Math.ceil(expiresInMs / 1000) : 0
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    const scopedPrefix = this.scopedKey(prefix)
    const keys = this.store
      .keys()
      .filter((candidate) => candidate.startsWith(scopedPrefix))
    if (!keys.length) {
      return 0
    }
    return this.store.del(keys)
  }

  async close(): Promise<void> {
    this.store.flushAll()
    this.store.close()
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
