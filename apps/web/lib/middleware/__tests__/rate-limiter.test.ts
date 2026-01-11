/**
 * Rate Limiter Tests
 * 
 * Tests for per-endpoint rate limiting (Blocker #6)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
    checkRateLimit,
    addRateLimitHeaders,
    cleanupRateLimitStore,
    getRateLimitStats,
} from '../rate-limiter';

// Mock NextRequest
function createMockRequest(pathname: string, ip = '127.0.0.1'): NextRequest {
    const url = new URL(`http://localhost${pathname}`);
    const headersMap = new Map([
        ['x-forwarded-for', ip],
    ]);

    const request = {
        nextUrl: { pathname: url.pathname },
        headers: {
            get: (key: string) => headersMap.get(key) ?? null,
        },
    } as unknown as NextRequest;

    return request;
}

describe('Rate Limiter', () => {
    beforeEach(() => {
        // Clean up store before each test
        cleanupRateLimitStore();
        // Force cleanup by advancing time mock
        vi.useFakeTimers();
        vi.setSystemTime(new Date());
    });

    describe('checkRateLimit', () => {
        it('should not limit first request', () => {
            const request = createMockRequest('/api/test');
            const result = checkRateLimit(request);

            expect(result.limited).toBe(false);
            expect(result.remaining).toBeLessThan(result.limit);
        });

        it('should track requests and decrement remaining', () => {
            const request = createMockRequest('/api/test');

            const first = checkRateLimit(request);
            const second = checkRateLimit(request);

            expect(second.remaining).toBeLessThan(first.remaining);
        });

        it('should limit after exceeding threshold', () => {
            const request = createMockRequest('/api/test');

            // Make 100 requests (default limit) + 1
            for (let i = 0; i < 101; i++) {
                checkRateLimit(request);
            }

            const result = checkRateLimit(request);
            expect(result.limited).toBe(true);
            expect(result.remaining).toBe(0);
        });

        it('should use different limits for AI endpoints', () => {
            const aiRequest = createMockRequest('/api/ai/process');
            const regularRequest = createMockRequest('/api/other');

            const aiResult = checkRateLimit(aiRequest);
            const regularResult = checkRateLimit(regularRequest);

            // AI endpoints should have lower limit (20) than default (100)
            expect(aiResult.limit).toBeLessThan(regularResult.limit);
        });

        it('should use lower limits for auth endpoints', () => {
            const authRequest = createMockRequest('/api/auth/login');
            const regularRequest = createMockRequest('/api/other');

            const authResult = checkRateLimit(authRequest);
            const regularResult = checkRateLimit(regularRequest);

            // Auth endpoints should have lower limit (10) than default (100)
            expect(authResult.limit).toBeLessThan(regularResult.limit);
        });

        it('should track different IPs separately', () => {
            const request1 = createMockRequest('/api/test', '192.168.1.1');
            const request2 = createMockRequest('/api/test', '192.168.1.2');

            // Exhaust limit for IP 1
            for (let i = 0; i < 101; i++) {
                checkRateLimit(request1);
            }

            const result1 = checkRateLimit(request1);
            const result2 = checkRateLimit(request2);

            expect(result1.limited).toBe(true);
            expect(result2.limited).toBe(false);
        });

        it('should reset after window expires', () => {
            const request = createMockRequest('/api/test');

            // Exhaust limit
            for (let i = 0; i < 101; i++) {
                checkRateLimit(request);
            }

            expect(checkRateLimit(request).limited).toBe(true);

            // Advance time past window (60 seconds)
            vi.advanceTimersByTime(61000);

            const afterReset = checkRateLimit(request);
            expect(afterReset.limited).toBe(false);
        });
    });

    describe('addRateLimitHeaders', () => {
        it('should add standard rate limit headers', () => {
            const { NextResponse } = require('next/server');
            const response = NextResponse.json({ ok: true });

            const rateLimit = {
                remaining: 50,
                resetAt: Date.now() + 30000,
                limit: 100,
            };

            const result = addRateLimitHeaders(response, rateLimit);

            expect(result.headers.get('X-RateLimit-Limit')).toBe('100');
            expect(result.headers.get('X-RateLimit-Remaining')).toBe('50');
            expect(result.headers.get('X-RateLimit-Reset')).toBeDefined();
        });
    });

    describe('getRateLimitStats', () => {
        it('should return stats about active rate limits', () => {
            const request = createMockRequest('/api/test');
            checkRateLimit(request);

            const stats = getRateLimitStats();

            expect(stats.activeKeys).toBeGreaterThan(0);
            expect(stats.byPattern).toBeDefined();
        });
    });

    describe('cleanupRateLimitStore', () => {
        it('should remove expired entries', () => {
            const request = createMockRequest('/api/test');
            checkRateLimit(request);

            const beforeCleanup = getRateLimitStats().activeKeys;

            // Advance time past window
            vi.advanceTimersByTime(61000);
            cleanupRateLimitStore();

            const afterCleanup = getRateLimitStats().activeKeys;

            expect(afterCleanup).toBeLessThan(beforeCleanup);
        });
    });
});
