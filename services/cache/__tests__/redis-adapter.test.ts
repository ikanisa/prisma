import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import RedisMock from 'ioredis-mock'
import { RedisCacheClient } from '../src/adapters/redis-adapter.js'

describe('RedisCacheClient', () => {
  let client: RedisMock
  let cache: RedisCacheClient

  beforeAll(async () => {
    client = new RedisMock()
    cache = new RedisCacheClient(client as unknown as any, { namespace: 'test', manageClient: false })
  })

  afterEach(async () => {
    await client.flushall()
  })

  it('stores values with TTL and expires them', async () => {
    await cache.set('foo', { hello: 'world' }, { ttlSeconds: 1 })
    expect(await cache.get('foo')).toEqual({ hello: 'world' })
    await new Promise((resolve) => setTimeout(resolve, 1200))
    expect(await cache.get('foo')).toBeNull()
  })

  it('deletes entries by prefix', async () => {
    await cache.set('prefix:a', 1)
    await cache.set('prefix:b', 2)
    await cache.set('other:c', 3)

    const deleted = await cache.deleteByPrefix('prefix:')
    expect(deleted).toBe(2)
    expect(await cache.get('prefix:a')).toBeNull()
    expect(await cache.get('other:c')).toBe(3)
  })
})
