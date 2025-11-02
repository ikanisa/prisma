import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryCacheClient } from '../src/adapters/memory-adapter.js'

describe('MemoryCacheClient', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stores and retrieves values with TTL', async () => {
    const cache = new MemoryCacheClient({ namespace: 'test' })
    await cache.set('foo', { value: 1 }, { ttlSeconds: 2 })

    expect(await cache.get<{ value: number }>('foo')).toEqual({ value: 1 })
    vi.advanceTimersByTime(2500)
    expect(await cache.get('foo')).toBeNull()
  })

  it('supports deleteByPrefix', async () => {
    const cache = new MemoryCacheClient({ namespace: 'test' })
    await cache.set('prefix:a', 1)
    await cache.set('prefix:b', 2)
    await cache.set('other:c', 3)

    const deleted = await cache.deleteByPrefix('prefix:')
    expect(deleted).toBe(2)
    expect(await cache.get('prefix:a')).toBeNull()
    expect(await cache.get('other:c')).toBe(3)
  })
})
