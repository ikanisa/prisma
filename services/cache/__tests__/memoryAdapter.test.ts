import { describe, expect, it, vi } from 'vitest';
import { MemoryCacheAdapter } from '../memoryAdapter';

vi.useFakeTimers();

describe('MemoryCacheAdapter', () => {
  it('stores and retrieves values with default TTL', async () => {
    const cache = new MemoryCacheAdapter({ defaultTtlSeconds: 1 });
    await cache.set('greeting', { hello: 'world' });
    expect(await cache.get<{ hello: string }>('greeting')).toEqual({ hello: 'world' });

    vi.advanceTimersByTime(1100);
    expect(await cache.get('greeting')).toBeUndefined();
  });

  it('supports explicit TTL overrides', async () => {
    const cache = new MemoryCacheAdapter();
    await cache.set('temp', 'value', { ttlSeconds: 2 });
    expect(await cache.ttl('temp')).toBeGreaterThan(0);
    vi.advanceTimersByTime(2100);
    expect(await cache.ttl('temp')).toBe(-2);
  });
});
