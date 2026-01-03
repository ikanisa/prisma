/**
 * Simple in-memory cache with TTL support.
 * Use for client-side caching of API responses.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly defaultTTL: number;

  constructor(defaultTTLSeconds = 300) {
    this.defaultTTL = defaultTTLSeconds * 1000;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  set(key: string, value: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  /**
   * Get or compute a value. If cached, returns cached value.
   * Otherwise, calls factory function and caches the result.
   */
  async getOrCompute(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    
    const value = await factory();
    this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Remove expired entries. Call periodically for memory efficiency.
   */
  cleanup(): number {
    let removed = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    return removed;
  }

  get size(): number {
    return this.cache.size;
  }
}

// Singleton caches for common use cases
export const apiCache = new SimpleCache(300); // 5 minutes
export const shortCache = new SimpleCache(60); // 1 minute
export const longCache = new SimpleCache(3600); // 1 hour

/**
 * Decorator for caching async function results.
 * Usage: @cached('my-key', 300)
 */
export function cached(keyPrefix: string, ttlSeconds = 300) {
  return function <T extends (...args: any[]) => Promise<any>>(
    _target: any,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value!;
    
    descriptor.value = async function (this: unknown, ...args: any[]) {
      const key = `${keyPrefix}:${JSON.stringify(args)}`;
      return apiCache.getOrCompute(key, () => originalMethod.apply(this, args), ttlSeconds);
    } as T;
    
    return descriptor;
  };
}

