/**
 * Tax Calculation Cache Service
 * 
 * High-performance caching layer for tax rate lookups and calculations.
 * Reduces API calls and improves response times for repeated calculations.
 */

// ============================================================================
// TYPES
// ============================================================================

export type JurisdictionCode = 'MT' | 'CA' | 'RW';

export interface CacheEntry<T> {
    key: string;
    value: T;
    createdAt: number;
    expiresAt: number;
    hits: number;
    lastAccessedAt: number;
}

export interface CacheStats {
    entries: number;
    hits: number;
    misses: number;
    hitRate: number;
    memoryUsage: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
}

export interface CacheConfig {
    maxEntries?: number;
    defaultTTL?: number;  // milliseconds
    cleanupInterval?: number;  // milliseconds
    enableStats?: boolean;
}

export interface TaxRateKey {
    jurisdiction: JurisdictionCode;
    taxType: string;
    province?: string;
    effectiveDate?: string;
}

export interface CachedTaxRate {
    rate: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
    source: string;
}

export interface CalculationCacheKey {
    jurisdiction: JurisdictionCode;
    calculationType: 'vat' | 'gst' | 'hst' | 'pst' | 'corporate' | 'withholding';
    baseAmount: number;
    options?: string; // Serialized options
}

// ============================================================================
// LRU CACHE IMPLEMENTATION
// ============================================================================

export class LRUCache<T> {
    private cache: Map<string, CacheEntry<T>> = new Map();
    private stats = { hits: 0, misses: 0 };
    private cleanupTimer: NodeJS.Timeout | null = null;

    constructor(private config: CacheConfig = {}) {
        this.config = {
            maxEntries: config.maxEntries || 10000,
            defaultTTL: config.defaultTTL || 60 * 60 * 1000, // 1 hour default
            cleanupInterval: config.cleanupInterval || 5 * 60 * 1000, // 5 minutes
            enableStats: config.enableStats ?? true,
        };

        if (this.config.cleanupInterval && this.config.cleanupInterval > 0) {
            this.startCleanupTimer();
        }
    }

    /**
     * Get value from cache
     */
    get(key: string): T | undefined {
        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            return undefined;
        }

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.stats.misses++;
            return undefined;
        }

        // Update access stats
        entry.hits++;
        entry.lastAccessedAt = Date.now();
        this.stats.hits++;

        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, entry);

        return entry.value;
    }

    /**
     * Set value in cache
     */
    set(key: string, value: T, ttl?: number): void {
        const now = Date.now();
        const expiresAt = now + (ttl || this.config.defaultTTL!);

        // Evict if at capacity
        if (this.cache.size >= this.config.maxEntries!) {
            this.evictOldest();
        }

        this.cache.set(key, {
            key,
            value,
            createdAt: now,
            expiresAt,
            hits: 0,
            lastAccessedAt: now,
        });
    }

    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }

    /**
     * Delete entry
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Clear all entries
     */
    clear(): void {
        this.cache.clear();
        this.stats = { hits: 0, misses: 0 };
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        let oldestEntry: Date | null = null;
        let newestEntry: Date | null = null;

        for (const entry of this.cache.values()) {
            const created = new Date(entry.createdAt);
            if (!oldestEntry || created < oldestEntry) oldestEntry = created;
            if (!newestEntry || created > newestEntry) newestEntry = created;
        }

        const totalRequests = this.stats.hits + this.stats.misses;

        return {
            entries: this.cache.size,
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
            memoryUsage: this.estimateMemoryUsage(),
            oldestEntry,
            newestEntry,
        };
    }

    /**
     * Evict oldest (least recently used) entry
     */
    private evictOldest(): void {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
            this.cache.delete(firstKey);
        }
    }

    /**
     * Remove expired entries
     */
    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Start periodic cleanup
     */
    private startCleanupTimer(): void {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval!);
    }

    /**
     * Stop cleanup timer
     */
    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    /**
     * Estimate memory usage in bytes
     */
    private estimateMemoryUsage(): number {
        // Rough estimate based on entry count
        return this.cache.size * 500; // ~500 bytes per entry average
    }
}

// ============================================================================
// TAX CALCULATION CACHE SERVICE
// ============================================================================

export interface TaxCalculationCacheConfig {
    ratesTTL?: number;       // TTL for tax rates (longer)
    calculationsTTL?: number; // TTL for calculations (shorter)
    maxRateEntries?: number;
    maxCalculationEntries?: number;
}

export class TaxCalculationCacheService {
    private ratesCache: LRUCache<CachedTaxRate>;
    private calculationsCache: LRUCache<number>;

    constructor(config: TaxCalculationCacheConfig = {}) {
        this.ratesCache = new LRUCache({
            maxEntries: config.maxRateEntries || 1000,
            defaultTTL: config.ratesTTL || 24 * 60 * 60 * 1000, // 24 hours for rates
        });

        this.calculationsCache = new LRUCache({
            maxEntries: config.maxCalculationEntries || 50000,
            defaultTTL: config.calculationsTTL || 15 * 60 * 1000, // 15 minutes for calculations
        });
    }

    /**
     * Generate cache key for tax rate
     */
    private generateRateKey(key: TaxRateKey): string {
        return `rate:${key.jurisdiction}:${key.taxType}:${key.province || 'default'}:${key.effectiveDate || 'current'}`;
    }

    /**
     * Generate cache key for calculation
     */
    private generateCalculationKey(key: CalculationCacheKey): string {
        return `calc:${key.jurisdiction}:${key.calculationType}:${key.baseAmount}:${key.options || ''}`;
    }

    /**
     * Get cached tax rate
     */
    getTaxRate(key: TaxRateKey): CachedTaxRate | undefined {
        return this.ratesCache.get(this.generateRateKey(key));
    }

    /**
     * Cache tax rate
     */
    setTaxRate(key: TaxRateKey, rate: CachedTaxRate, ttl?: number): void {
        this.ratesCache.set(this.generateRateKey(key), rate, ttl);
    }

    /**
     * Get cached calculation result
     */
    getCalculation(key: CalculationCacheKey): number | undefined {
        return this.calculationsCache.get(this.generateCalculationKey(key));
    }

    /**
     * Cache calculation result
     */
    setCalculation(key: CalculationCacheKey, result: number, ttl?: number): void {
        this.calculationsCache.set(this.generateCalculationKey(key), result, ttl);
    }

    /**
     * Get or compute tax rate (with caching)
     */
    async getOrComputeRate(
        key: TaxRateKey,
        compute: () => Promise<CachedTaxRate>
    ): Promise<CachedTaxRate> {
        const cached = this.getTaxRate(key);
        if (cached) {
            return cached;
        }

        const computed = await compute();
        this.setTaxRate(key, computed);
        return computed;
    }

    /**
     * Get or compute calculation (with caching)
     */
    async getOrComputeCalculation(
        key: CalculationCacheKey,
        compute: () => Promise<number>
    ): Promise<number> {
        const cached = this.getCalculation(key);
        if (cached !== undefined) {
            return cached;
        }

        const computed = await compute();
        this.setCalculation(key, computed);
        return computed;
    }

    /**
     * Invalidate all rates for a jurisdiction
     */
    invalidateJurisdictionRates(jurisdiction: JurisdictionCode): void {
        // Since we can't iterate and delete efficiently, we just clear all rates
        // In production, you'd want a more sophisticated approach
        this.ratesCache.clear();
    }

    /**
     * Get combined cache statistics
     */
    getStats(): { rates: CacheStats; calculations: CacheStats } {
        return {
            rates: this.ratesCache.getStats(),
            calculations: this.calculationsCache.getStats(),
        };
    }

    /**
     * Clear all caches
     */
    clearAll(): void {
        this.ratesCache.clear();
        this.calculationsCache.clear();
    }

    /**
     * Destroy cache (cleanup timers)
     */
    destroy(): void {
        this.ratesCache.destroy();
        this.calculationsCache.destroy();
    }
}

// ============================================================================
// RATE LIMITER
// ============================================================================

export interface RateLimiterConfig {
    maxRequests: number;
    windowMs: number;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
}

export class RateLimiter {
    private windows: Map<string, { count: number; resetAt: number }> = new Map();

    constructor(private config: RateLimiterConfig) { }

    /**
     * Check if request is allowed
     */
    checkLimit(key: string): RateLimitResult {
        const now = Date.now();
        const window = this.windows.get(key);

        if (!window || now > window.resetAt) {
            // New window
            this.windows.set(key, {
                count: 1,
                resetAt: now + this.config.windowMs,
            });
            return {
                allowed: true,
                remaining: this.config.maxRequests - 1,
                resetAt: new Date(now + this.config.windowMs),
            };
        }

        if (window.count >= this.config.maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: new Date(window.resetAt),
            };
        }

        window.count++;
        return {
            allowed: true,
            remaining: this.config.maxRequests - window.count,
            resetAt: new Date(window.resetAt),
        };
    }

    /**
     * Reset limit for a key
     */
    reset(key: string): void {
        this.windows.delete(key);
    }

    /**
     * Cleanup expired windows
     */
    cleanup(): void {
        const now = Date.now();
        for (const [key, window] of this.windows.entries()) {
            if (now > window.resetAt) {
                this.windows.delete(key);
            }
        }
    }
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

export interface CircuitBreakerConfig {
    failureThreshold: number;
    successThreshold: number;
    timeout: number;  // ms before trying again
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
    private state: CircuitState = 'closed';
    private failures = 0;
    private successes = 0;
    private lastFailureTime = 0;

    constructor(private config: CircuitBreakerConfig) { }

    /**
     * Execute function with circuit breaker protection
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === 'open') {
            if (Date.now() - this.lastFailureTime > this.config.timeout) {
                this.state = 'half-open';
            } else {
                throw new Error('Circuit breaker is open');
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    /**
     * Get current state
     */
    getState(): CircuitState {
        return this.state;
    }

    /**
     * Get stats
     */
    getStats(): { state: CircuitState; failures: number; successes: number } {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes,
        };
    }

    private onSuccess(): void {
        this.failures = 0;
        if (this.state === 'half-open') {
            this.successes++;
            if (this.successes >= this.config.successThreshold) {
                this.state = 'closed';
                this.successes = 0;
            }
        }
    }

    private onFailure(): void {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= this.config.failureThreshold) {
            this.state = 'open';
        }
    }

    /**
     * Reset to closed state
     */
    reset(): void {
        this.state = 'closed';
        this.failures = 0;
        this.successes = 0;
    }
}

// Factory functions
export function createTaxCalculationCache(config?: TaxCalculationCacheConfig): TaxCalculationCacheService {
    return new TaxCalculationCacheService(config);
}

export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
    return new RateLimiter(config);
}

export function createCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
    return new CircuitBreaker(config);
}
