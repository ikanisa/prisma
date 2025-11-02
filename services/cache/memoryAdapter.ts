import { deserializeValue, serializeValue } from './serialization';
import type { CacheClient, CacheKey, CacheSetOptions } from './types';

interface MemoryEntry {
  value: string;
  expiresAt: number | null;
}

function resolveExpiry(ttlSeconds?: number): number | null {
  if (!ttlSeconds || ttlSeconds <= 0) {
    return null;
  }
  return Date.now() + ttlSeconds * 1000;
}

export class MemoryCacheAdapter implements CacheClient {
  private readonly store = new Map<CacheKey, MemoryEntry>();
  private readonly defaultTtlSeconds: number | null;

  constructor(options?: { defaultTtlSeconds?: number }) {
    this.defaultTtlSeconds = options?.defaultTtlSeconds ?? null;
  }

  async get<T>(key: CacheKey): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return deserializeValue<T>(entry.value);
  }

  async set<T>(key: CacheKey, value: T, options?: CacheSetOptions): Promise<void> {
    const payload = serializeValue(value);
    const ttlSeconds = options?.ttlSeconds ?? this.defaultTtlSeconds ?? undefined;
    const expiresAt = resolveExpiry(ttlSeconds);
    this.store.set(key, { value: payload, expiresAt });
  }

  async del(key: CacheKey | CacheKey[]): Promise<void> {
    if (Array.isArray(key)) {
      for (const k of key) {
        this.store.delete(k);
      }
      return;
    }
    this.store.delete(key);
  }

  async ttl(key: CacheKey): Promise<number | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return -2;
    }
    if (!entry.expiresAt) {
      return -1;
    }
    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : -2;
  }
}
