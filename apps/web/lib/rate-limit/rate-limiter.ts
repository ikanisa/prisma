/**
 * Rate Limiting
 * 
 * Token bucket rate limiter for API endpoints
 */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: any) => string; // Function to generate rate limit key
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

class RateLimiter {
  private buckets: Map<string, { tokens: number; lastRefill: number }> = new Map();

  /**
   * Check if request is allowed
   */
  check(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket) {
      // Create new bucket
      this.buckets.set(key, {
        tokens: config.maxRequests - 1,
        lastRefill: now,
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
      };
    }

    // Refill tokens based on elapsed time
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor((elapsed / config.windowMs) * config.maxRequests);
    
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(config.maxRequests, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    // Check if request is allowed
    if (bucket.tokens > 0) {
      bucket.tokens--;
      this.buckets.set(key, bucket);

      return {
        allowed: true,
        remaining: bucket.tokens,
        resetTime: bucket.lastRefill + config.windowMs,
      };
    } else {
      // Rate limit exceeded
      const retryAfter = Math.ceil((bucket.lastRefill + config.windowMs - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetTime: bucket.lastRefill + config.windowMs,
        retryAfter,
      };
    }
  }

  /**
   * Clean up old buckets
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key);
      }
    }
  }
}

/**
 * Global rate limiter
 */
export const rateLimiter = new RateLimiter();

/**
 * Default rate limit configurations
 */
export const RateLimitConfigs = {
  // Tool calls
  TOOL_CALLS: {
    windowMs: 60000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },
  
  // Agent requests
  AGENT_REQUESTS: {
    windowMs: 60000, // 1 minute
    maxRequests: 30, // 30 requests per minute
  },
  
  // API requests
  API_REQUESTS: {
    windowMs: 60000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },
  
  // MCP requests
  MCP_REQUESTS: {
    windowMs: 60000, // 1 minute
    maxRequests: 50, // 50 requests per minute
  },
  
  // OAuth requests
  OAUTH_REQUESTS: {
    windowMs: 60000, // 1 minute
    maxRequests: 10, // 10 requests per minute
  },
} as const;

/**
 * Rate limit middleware for Next.js API routes
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (request: any, context?: any) => Promise<Response>
) {
  return async (request: any, context?: any): Promise<Response> => {
    // Generate rate limit key
    const keyGenerator = config.keyGenerator || ((req: any) => {
      // Default: use IP address or user ID
      const ip = req.headers.get('x-forwarded-for') || 
                 req.headers.get('x-real-ip') || 
                 'unknown';
      return ip;
    });

    const key = keyGenerator(request);
    const result = rateLimiter.check(key, config);

    // Add rate limit headers
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    headers.set('X-RateLimit-Remaining', result.remaining.toString());
    headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      headers.set('Retry-After', result.retryAfter?.toString() || '60');
      
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers,
        }
      );
    }

    // Execute handler
    const response = await handler(request, context);
    
    // Add rate limit headers to response
    for (const [key, value] of headers.entries()) {
      response.headers.set(key, value);
    }

    return response;
  };
}

