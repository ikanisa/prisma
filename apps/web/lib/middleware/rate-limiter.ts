/**
 * Per-Endpoint Rate Limiting Middleware
 * 
 * Implements rate limiting with different limits per endpoint type.
 * Uses in-memory storage for Edge Runtime compatibility.
 * 
 * Addresses: Audit Blocker #6 - Per-endpoint rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';

// Rate limit configuration per endpoint pattern
const RATE_LIMITS: Record<string, { requests: number; windowMs: number }> = {
    // AI endpoints - more restrictive (expensive operations)
    '/api/ai/': { requests: 20, windowMs: 60000 },        // 20/min
    '/api/agent/': { requests: 30, windowMs: 60000 },     // 30/min

    // Authentication endpoints - prevent brute force
    '/api/auth/': { requests: 10, windowMs: 60000 },      // 10/min

    // ChatKit endpoints - moderate limits
    '/api/chatkit/': { requests: 50, windowMs: 60000 },   // 50/min

    // Metrics endpoint - only internal use
    '/api/metrics': { requests: 5, windowMs: 60000 },     // 5/min

    // Default for all other API routes
    'default': { requests: 100, windowMs: 60000 },        // 100/min
};

// In-memory rate limit store (for Edge Runtime)
// In production with multiple instances, use Cloudflare KV or Durable Objects
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Get rate limit configuration for a given path
 */
function getRateLimitConfig(pathname: string): { requests: number; windowMs: number } {
    for (const [pattern, config] of Object.entries(RATE_LIMITS)) {
        if (pattern !== 'default' && pathname.startsWith(pattern)) {
            return config;
        }
    }
    return RATE_LIMITS['default'];
}

/**
 * Generate a rate limit key for the request
 */
function getRateLimitKey(request: NextRequest, pathname: string): string {
    // Use IP + path pattern for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('cf-connecting-ip')
        || 'unknown';

    // Group by endpoint pattern
    const pattern = Object.keys(RATE_LIMITS).find(
        p => p !== 'default' && pathname.startsWith(p)
    ) || 'default';

    return `${ip}:${pattern}`;
}

/**
 * Check if request is rate limited
 */
export function checkRateLimit(request: NextRequest): {
    limited: boolean;
    remaining: number;
    resetAt: number;
    limit: number;
} {
    const pathname = request.nextUrl.pathname;
    const config = getRateLimitConfig(pathname);
    const key = getRateLimitKey(request, pathname);
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
        // Create new window
        entry = { count: 0, resetAt: now + config.windowMs };
        rateLimitStore.set(key, entry);
    }

    // Increment count
    entry.count++;

    // Check if limited
    const limited = entry.count > config.requests;
    const remaining = Math.max(0, config.requests - entry.count);

    return {
        limited,
        remaining,
        resetAt: entry.resetAt,
        limit: config.requests,
    };
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
    response: NextResponse,
    rateLimit: { remaining: number; resetAt: number; limit: number }
): NextResponse {
    response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimit.resetAt / 1000).toString());
    return response;
}

/**
 * Rate limiting middleware for API routes
 */
export async function rateLimitMiddleware(
    request: NextRequest,
    next: () => Promise<NextResponse>
): Promise<NextResponse> {
    // Skip rate limiting for non-API routes
    if (!request.nextUrl.pathname.startsWith('/api/')) {
        return next();
    }

    // Check rate limit
    const rateLimit = checkRateLimit(request);

    if (rateLimit.limited) {
        // Return 429 Too Many Requests
        const response = NextResponse.json(
            {
                error: 'Too many requests',
                message: `Rate limit exceeded. Please try again in ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} seconds.`,
                retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
            },
            { status: 429 }
        );

        return addRateLimitHeaders(response, rateLimit);
    }

    // Process request and add headers to response
    const response = await next();
    return addRateLimitHeaders(response, rateLimit);
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt < now) {
            rateLimitStore.delete(key);
        }
    }
}

/**
 * Get current rate limit stats for monitoring
 */
export function getRateLimitStats(): {
    activeKeys: number;
    byPattern: Record<string, number>;
} {
    const byPattern: Record<string, number> = {};

    for (const key of rateLimitStore.keys()) {
        const pattern = key.split(':')[1] || 'unknown';
        byPattern[pattern] = (byPattern[pattern] || 0) + 1;
    }

    return {
        activeKeys: rateLimitStore.size,
        byPattern,
    };
}
