export type CacheKey = string;

export type CacheSetOptions = {
  /**
   * Time-to-live in seconds for this entry. When omitted, the adapter's default TTL is used.
   */
  ttlSeconds?: number;
};

export interface CacheClient {
  /**
   * Retrieve a cached value. Returns `undefined` when the key is not present or has expired.
   */
  get<T = unknown>(key: CacheKey): Promise<T | undefined>;

  /**
   * Store a value in the cache. Implementations should honour TTL semantics when provided.
   */
  set<T = unknown>(key: CacheKey, value: T, options?: CacheSetOptions): Promise<void>;

  /**
   * Delete one or more keys from the cache. Missing keys should be ignored.
   */
  del(key: CacheKey | CacheKey[]): Promise<void>;

  /**
   * Fetch the remaining TTL (in seconds) for a given key. `null` means no TTL/unknown, `-1` means
   * the key exists without expiry, and `-2` means the key does not exist.
   */
  ttl(key: CacheKey): Promise<number | null>;
}
