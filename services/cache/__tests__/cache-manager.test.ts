import { describe, expect, test, vi, beforeEach } from 'vitest';
import { CacheManager } from '../src/cache-manager.js';
import type { CacheClient, CacheClientSetOptions } from '../src/types.js';
import { jsonSerializer } from '../src/serialization.js';

class InMemoryCacheClient implements CacheClient {
  private store = new Map<string, { value: string; expiresAt: number | null }>();

  constructor(private readonly now: () => number) {}

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, options?: CacheClientSetOptions): Promise<void> {
    const ttlSeconds = options?.ttlSeconds ?? null;
    const expiresAt = ttlSeconds ? this.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async del(keys: string | string[]): Promise<void> {
    const resolved = Array.isArray(keys) ? keys : [keys];
    resolved.forEach((key) => this.store.delete(key));
  }

  async ttl(key: string): Promise<number | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt === null) return null;
    const remaining = entry.expiresAt - this.now();
    return remaining <= 0 ? null : Math.ceil(remaining / 1000);
  }

  async disconnect(): Promise<void> {
    this.store.clear();
  }
}

describe('CacheManager', () => {
  let now = Date.now();
  const nowFn = () => now;
  let client: InMemoryCacheClient;
  let manager: CacheManager;

  beforeEach(() => {
    now = 1_700_000_000_000;
    client = new InMemoryCacheClient(nowFn);
    manager = new CacheManager({ client, keyPrefix: 'test', defaultSerializer: jsonSerializer, defaultTtlSeconds: 30 });
  });

  test('stores and retrieves values using JSON serialization', async () => {
    const loader = vi.fn().mockResolvedValue({ value: 123 });
    const result = await manager.withCache({ key: ['controls', '1'], loader });
    expect(result).toEqual({ value: 123 });
    expect(loader).toHaveBeenCalledTimes(1);

    const cached = await manager.withCache({ key: ['controls', '1'], loader });
    expect(cached).toEqual({ value: 123 });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  test('skips cache when ttl is zero', async () => {
    const loader = vi.fn().mockResolvedValue({ fresh: true });
    const result = await manager.withCache({ key: ['skip'], loader, ttlSeconds: 0 });
    expect(result).toEqual({ fresh: true });
    const second = await manager.withCache({ key: ['skip'], loader, ttlSeconds: 0 });
    expect(second).toEqual({ fresh: true });
    expect(loader).toHaveBeenCalledTimes(2);
  });

  test('evicts values on invalidate', async () => {
    const loader = vi.fn().mockResolvedValue({ cached: true });
    await manager.withCache({ key: ['controls', 'invalidate'], loader });
    expect(loader).toHaveBeenCalledTimes(1);

    await manager.invalidate({ key: ['controls', 'invalidate'] });

    await manager.withCache({ key: ['controls', 'invalidate'], loader });
    expect(loader).toHaveBeenCalledTimes(2);
  });

  test('ttl reflects remaining lifetime', async () => {
    await manager.withCache({ key: ['controls', 'ttl'], loader: async () => 'value' });
    const ttlBefore = await manager.ttl(['controls', 'ttl']);
    expect(ttlBefore).toBeGreaterThan(0);

    now += 20_000;
    const ttlAfter = await manager.ttl(['controls', 'ttl']);
    expect(ttlAfter).toBeGreaterThan(0);
    expect(ttlAfter).toBeLessThanOrEqual(ttlBefore ?? Infinity);
  });
});
