import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { CacheManager } from '../src/cache-manager.js';
import type { CacheClient, CacheClientSetOptions } from '../src/types.js';
import { jsonSerializer } from '../src/serialization.js';
import {
  invalidateRouteCache,
  resetCacheManagerForTests,
  setCacheManagerForTests,
  withRouteCache,
} from '../../../apps/web/lib/cache/route-cache.js';

class InMemoryClient implements CacheClient {
  private store = new Map<string, { value: string; expiresAt: number | null }>();

  constructor(private readonly now: () => number) {}

  get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return Promise.resolve(null);
    if (entry.expiresAt !== null && entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return Promise.resolve(null);
    }
    return Promise.resolve(entry.value);
  }

  set(key: string, value: string, options?: CacheClientSetOptions): Promise<void> {
    const ttlSeconds = options?.ttlSeconds ?? null;
    const expiresAt = ttlSeconds ? this.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return Promise.resolve();
  }

  del(keys: string | string[]): Promise<void> {
    const resolved = Array.isArray(keys) ? keys : [keys];
    resolved.forEach((key) => this.store.delete(key));
    return Promise.resolve();
  }

  ttl(): Promise<number | null> {
    return Promise.resolve(null);
  }

  disconnect(): Promise<void> {
    this.store.clear();
    return Promise.resolve();
  }
}

describe('route cache wiring', () => {
  const now = () => 1_700_000_000_000;

  beforeEach(() => {
    const client = new InMemoryClient(now);
    const manager = new CacheManager({
      client,
      keyPrefix: 'apps:web',
      defaultSerializer: jsonSerializer,
      defaultTtlSeconds: 60,
    });
    setCacheManagerForTests(manager);
  });

  afterEach(() => {
    resetCacheManagerForTests();
  });

  test('withRouteCache reuses cached payloads until invalidated', async () => {
    const loader = vi.fn().mockResolvedValue({ ok: true, count: 1 });

    const first = await withRouteCache('controls', ['org-1', 'eng-1'], loader);
    expect(first).toEqual({ ok: true, count: 1 });
    expect(loader).toHaveBeenCalledTimes(1);

    const second = await withRouteCache('controls', ['org-1', 'eng-1'], loader);
    expect(second).toEqual({ ok: true, count: 1 });
    expect(loader).toHaveBeenCalledTimes(1);

    await invalidateRouteCache('controls', ['org-1', 'eng-1']);

    const third = await withRouteCache('controls', ['org-1', 'eng-1'], loader);
    expect(third).toEqual({ ok: true, count: 1 });
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
