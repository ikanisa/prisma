/**
 * Rate Limiter
 * 
 * Token bucket and sliding window rate limiting algorithms.
 */

import type {
    RateLimitConfig,
    RateLimitState,
    RateLimitResult,
    GatewayRequest,
    GatewayContext,
    GatewayMiddleware,
} from './types';

// ============================================================================
// RATE LIMIT STORE
// ============================================================================

export interface RateLimitStore {
    get(key: string): Promise<RateLimitState | null>;
    set(key: string, state: RateLimitState): Promise<void>;
    increment(key: string, windowMs: number): Promise<{ count: number; resetAt: Date }>;
    cleanup(): Promise<number>;
}

export class InMemoryRateLimitStore implements RateLimitStore {
    private store = new Map<string, RateLimitState>();

    async get(key: string): Promise<RateLimitState | null> {
        const state = this.store.get(key);
        if (!state) return null;

        // Check if window has expired
        if (state.resetAt < new Date()) {
            this.store.delete(key);
            return null;
        }

        return state;
    }

    async set(key: string, state: RateLimitState): Promise<void> {
        this.store.set(key, state);
    }

    async increment(key: string, windowMs: number): Promise<{ count: number; resetAt: Date }> {
        const now = new Date();
        const existing = await this.get(key);

        if (existing) {
            existing.count++;
            this.store.set(key, existing);
            return { count: existing.count, resetAt: existing.resetAt };
        }

        const resetAt = new Date(now.getTime() + windowMs);
        const state: RateLimitState = { key, count: 1, resetAt };
        this.store.set(key, state);

        return { count: 1, resetAt };
    }

    async cleanup(): Promise<number> {
        const now = new Date();
        let cleaned = 0;

        for (const [key, state] of this.store) {
            if (state.resetAt < now) {
                this.store.delete(key);
                cleaned++;
            }
        }

        return cleaned;
    }
}

// ============================================================================
// RATE LIMITER
// ============================================================================

export class RateLimiter {
    private config: RateLimitConfig;
    private store: RateLimitStore;

    constructor(config: RateLimitConfig, store?: RateLimitStore) {
        this.config = {
            standardHeaders: true,
            legacyHeaders: false,
            message: 'Too many requests, please try again later.',
            ...config,
        };
        this.store = store ?? new InMemoryRateLimitStore();
    }

    /**
     * Check rate limit for a request
     */
    async check(request: GatewayRequest): Promise<RateLimitResult> {
        // Check if should skip
        if (this.config.skip?.(request)) {
            return {
                allowed: true,
                remaining: this.config.maxRequests,
                resetAt: new Date(Date.now() + this.config.windowMs),
            };
        }

        // Generate key
        const key = this.generateKey(request);

        // Increment counter
        const { count, resetAt } = await this.store.increment(key, this.config.windowMs);

        const remaining = Math.max(0, this.config.maxRequests - count);
        const allowed = count <= this.config.maxRequests;

        return {
            allowed,
            remaining,
            resetAt,
            retryAfter: allowed ? undefined : Math.ceil((resetAt.getTime() - Date.now()) / 1000),
        };
    }

    /**
     * Get rate limit headers
     */
    getHeaders(result: RateLimitResult): Record<string, string> {
        const headers: Record<string, string> = {};

        if (this.config.standardHeaders) {
            headers['RateLimit-Limit'] = this.config.maxRequests.toString();
            headers['RateLimit-Remaining'] = result.remaining.toString();
            headers['RateLimit-Reset'] = Math.ceil(result.resetAt.getTime() / 1000).toString();
        }

        if (this.config.legacyHeaders) {
            headers['X-RateLimit-Limit'] = this.config.maxRequests.toString();
            headers['X-RateLimit-Remaining'] = result.remaining.toString();
            headers['X-RateLimit-Reset'] = result.resetAt.toISOString();
        }

        if (result.retryAfter) {
            headers['Retry-After'] = result.retryAfter.toString();
        }

        return headers;
    }

    /**
     * Create middleware
     */
    middleware(): GatewayMiddleware {
        return async (ctx: GatewayContext, next: () => Promise<void>) => {
            const result = await this.check(ctx.request);
            ctx.rateLimit = result;

            const headers = this.getHeaders(result);

            if (!result.allowed) {
                ctx.response = {
                    status: 429,
                    headers,
                    body: {
                        error: 'Too Many Requests',
                        message: this.config.message,
                        retryAfter: result.retryAfter,
                    },
                };
                return;
            }

            await next();

            // Add headers to response
            if (ctx.response) {
                ctx.response.headers = { ...ctx.response.headers, ...headers };
            }
        };
    }

    private generateKey(request: GatewayRequest): string {
        if (this.config.keyGenerator) {
            return this.config.keyGenerator(request);
        }

        // Default: use IP + user ID if available
        const parts = [request.ip ?? 'unknown'];
        if (request.userId) parts.push(request.userId);
        if (request.apiKey) parts.push(request.apiKey);

        return parts.join(':');
    }
}

// ============================================================================
// SLIDING WINDOW RATE LIMITER
// ============================================================================

interface SlidingWindowEntry {
    timestamp: number;
}

export class SlidingWindowLimiter {
    private config: RateLimitConfig;
    private windows = new Map<string, SlidingWindowEntry[]>();

    constructor(config: RateLimitConfig) {
        this.config = config;
    }

    async check(request: GatewayRequest): Promise<RateLimitResult> {
        if (this.config.skip?.(request)) {
            return {
                allowed: true,
                remaining: this.config.maxRequests,
                resetAt: new Date(Date.now() + this.config.windowMs),
            };
        }

        const key = this.config.keyGenerator?.(request) ?? request.ip ?? 'unknown';
        const now = Date.now();
        const windowStart = now - this.config.windowMs;

        // Get window entries
        let entries = this.windows.get(key) ?? [];

        // Remove expired entries
        entries = entries.filter(e => e.timestamp > windowStart);

        // Check limit
        const count = entries.length;
        const allowed = count < this.config.maxRequests;

        if (allowed) {
            entries.push({ timestamp: now });
            this.windows.set(key, entries);
        }

        const oldest = entries[0]?.timestamp ?? now;
        const resetAt = new Date(oldest + this.config.windowMs);

        return {
            allowed,
            remaining: Math.max(0, this.config.maxRequests - count - (allowed ? 1 : 0)),
            resetAt,
            retryAfter: allowed ? undefined : Math.ceil((resetAt.getTime() - now) / 1000),
        };
    }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createRateLimiter(config: RateLimitConfig, store?: RateLimitStore): RateLimiter {
    return new RateLimiter(config, store);
}

export function createSlidingWindowLimiter(config: RateLimitConfig): SlidingWindowLimiter {
    return new SlidingWindowLimiter(config);
}
