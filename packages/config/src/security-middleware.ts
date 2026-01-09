/**
 * Security Middleware
 * 
 * Express/Next.js compatible middleware for applying security measures.
 * Can be used with any Node.js HTTP framework.
 * 
 * @example
 * ```typescript
 * // Express
 * import { securityMiddleware } from '@prisma/config/security-middleware';
 * app.use(securityMiddleware());
 * 
 * // Next.js API route
 * export default withSecurity(handler);
 * ```
 */

import {
    generateCSPHeader,
    securityHeaders,
    checkWAFRules,
    rateLimits,
    type RateLimitConfig,
    type WAFRule,
    cspConfig,
} from './security.js';

// ============================================================================
// TYPES
// ============================================================================

export interface SecurityMiddlewareOptions {
    enableCSP?: boolean;
    enableWAF?: boolean;
    enableRateLimit?: boolean;
    rateLimitKey?: string;
    wafAction?: 'block' | 'log';
    onWAFBlock?: (rule: WAFRule, input: string) => void;
    onRateLimitExceeded?: (key: string, limit: RateLimitConfig) => void;
}

export interface Request {
    method: string;
    url: string;
    body?: unknown;
    query?: Record<string, string>;
    headers: {
        get(name: string): string | undefined;
    };
    ip?: string;
}

export interface Response {
    status(code: number): Response;
    json(data: unknown): void;
    headers: {
        set(name: string, value: string): void;
    };
}

// ============================================================================
// RATE LIMITER (IN-MEMORY)
// ============================================================================

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

class InMemoryRateLimiter {
    private store: Map<string, RateLimitEntry> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor() {
        // Cleanup expired entries every minute
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }

    check(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetAt: number } {
        const now = Date.now();
        const entry = this.store.get(key);

        if (!entry || entry.resetAt <= now) {
            // New window
            const resetAt = now + config.windowMs;
            this.store.set(key, { count: 1, resetAt });
            return { allowed: true, remaining: config.maxRequests - 1, resetAt };
        }

        if (entry.count >= config.maxRequests) {
            return { allowed: false, remaining: 0, resetAt: entry.resetAt };
        }

        entry.count++;
        return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (entry.resetAt <= now) {
                this.store.delete(key);
            }
        }
    }

    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}

const rateLimiter = new InMemoryRateLimiter();

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(res: Response, options: SecurityMiddlewareOptions = {}): void {
    // Standard security headers
    for (const [name, value] of Object.entries(securityHeaders)) {
        res.headers.set(name, value);
    }

    // CSP header
    if (options.enableCSP !== false) {
        const cspHeader = generateCSPHeader(cspConfig);
        res.headers.set('Content-Security-Policy', cspHeader);
    }
}

/**
 * Check request against WAF rules
 */
export function checkRequestWAF(
    req: Request,
    options: SecurityMiddlewareOptions = {}
): { blocked: boolean; rule?: WAFRule } {
    if (options.enableWAF === false) {
        return { blocked: false };
    }

    // Check URL
    if (req.url) {
        const rule = checkWAFRules(req.url);
        if (rule && rule.action === 'block') {
            options.onWAFBlock?.(rule, req.url);
            return { blocked: true, rule };
        }
    }

    // Check query parameters
    if (req.query) {
        for (const value of Object.values(req.query)) {
            const rule = checkWAFRules(value);
            if (rule && rule.action === 'block') {
                options.onWAFBlock?.(rule, value);
                return { blocked: true, rule };
            }
        }
    }

    // Check body (if JSON)
    if (req.body && typeof req.body === 'object') {
        const bodyStr = JSON.stringify(req.body);
        const rule = checkWAFRules(bodyStr);
        if (rule && rule.action === 'block') {
            options.onWAFBlock?.(rule, bodyStr);
            return { blocked: true, rule };
        }
    }

    return { blocked: false };
}

/**
 * Check rate limit
 */
export function checkRateLimit(
    req: Request,
    options: SecurityMiddlewareOptions = {}
): { allowed: boolean; remaining: number; resetAt: number } {
    if (options.enableRateLimit === false) {
        return { allowed: true, remaining: 999, resetAt: Date.now() + 60000 };
    }

    const limitKey = options.rateLimitKey ?? 'api';
    const config = rateLimits[limitKey] ?? rateLimits.api;

    // Generate client key (IP-based or custom)
    const clientKey = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
    const key = `${limitKey}:${clientKey}`;

    const result = rateLimiter.check(key, config);

    if (!result.allowed) {
        options.onRateLimitExceeded?.(key, config);
    }

    return result;
}

/**
 * Express-style middleware
 */
export function securityMiddleware(options: SecurityMiddlewareOptions = {}) {
    return (req: Request, res: Response, next: () => void): void => {
        // Apply security headers
        applySecurityHeaders(res, options);

        // WAF check
        const wafResult = checkRequestWAF(req, options);
        if (wafResult.blocked) {
            res.status(403).json({
                error: 'Forbidden',
                message: 'Request blocked by security rules',
                ruleId: wafResult.rule?.id,
            });
            return;
        }

        // Rate limit check
        const rateLimitResult = checkRateLimit(req, options);
        res.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
        res.headers.set('X-RateLimit-Reset', rateLimitResult.resetAt.toString());

        if (!rateLimitResult.allowed) {
            res.status(429).json({
                error: 'Too Many Requests',
                message: 'Rate limit exceeded',
                retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
            });
            return;
        }

        next();
    };
}

/**
 * Next.js API route wrapper
 */
export function withSecurity<T extends (req: Request, res: Response) => Promise<void>>(
    handler: T,
    options: SecurityMiddlewareOptions = {}
): T {
    return (async (req: Request, res: Response) => {
        // Apply security headers
        applySecurityHeaders(res, options);

        // WAF check
        const wafResult = checkRequestWAF(req, options);
        if (wafResult.blocked) {
            res.status(403).json({
                error: 'Forbidden',
                message: 'Request blocked by security rules',
            });
            return;
        }

        // Rate limit check
        const rateLimitResult = checkRateLimit(req, options);
        res.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
        res.headers.set('X-RateLimit-Reset', rateLimitResult.resetAt.toString());

        if (!rateLimitResult.allowed) {
            res.status(429).json({
                error: 'Too Many Requests',
                retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
            });
            return;
        }

        return handler(req, res);
    }) as T;
}

/**
 * Cloudflare Workers / Edge Runtime compatible header application
 */
export function getSecurityHeaders(options: SecurityMiddlewareOptions = {}): Headers {
    const headers = new Headers();

    for (const [name, value] of Object.entries(securityHeaders)) {
        headers.set(name, value);
    }

    if (options.enableCSP !== false) {
        headers.set('Content-Security-Policy', generateCSPHeader(cspConfig));
    }

    return headers;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { rateLimiter };
