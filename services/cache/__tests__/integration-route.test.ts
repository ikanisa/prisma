import { describe, expect, it } from 'vitest'
import { createCacheClient } from '../src/index.js'

interface SearchResponse {
  results: string[]
}

describe('cache integration in sample route', () => {
  it('serves cached responses on subsequent calls', async () => {
    const cache = await createCacheClient({ adapter: 'memory', namespace: 'route-test' })
    let invocations = 0

    async function fetchFromSource(query: string): Promise<SearchResponse> {
      invocations += 1
      return { results: [`${query}:${invocations}`] }
    }

    async function handleSearch(query: string) {
      const key = `search:demo:${query}`
      const cached = await cache.get<SearchResponse>(key)
      if (cached) {
        return { cached: true, payload: cached }
      }

      const payload = await fetchFromSource(query)
      await cache.set(key, payload, { ttlSeconds: 5 })
      return { cached: false, payload }
    }

    const first = await handleSearch('alpha')
    const second = await handleSearch('alpha')

    expect(first.cached).toBe(false)
    expect(second.cached).toBe(true)
    expect(second.payload).toEqual(first.payload)
  })

  it('supports cache invalidation on mutation', async () => {
    const cache = await createCacheClient({ adapter: 'memory', namespace: 'route-test' })
    await cache.set('search:demo:alpha', { results: ['alpha'] }, { ttlSeconds: 30 })
    await cache.set('search:demo:beta', { results: ['beta'] }, { ttlSeconds: 30 })

    await cache.deleteByPrefix('search:demo:')

    expect(await cache.get('search:demo:alpha')).toBeNull()
    expect(await cache.get('search:demo:beta')).toBeNull()
  })
})
