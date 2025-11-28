# Week 2: Security Hardening Implementation
**Timeline**: December 2-8, 2025  
**Target Production Score**: 67 → 85/100 (+18 points)

## Overview
This week focuses on implementing critical security hardening measures including CSP headers, rate limiting, database optimization, and security middleware.

## Priority Matrix

| Task | Priority | Impact | Effort | Score Gain |
|------|----------|--------|--------|------------|
| CSP Headers | HIGH | +5 | 2h | Security +15% |
| Rate Limiting | HIGH | +4 | 3h | Security +12% |
| Database RLS | CRITICAL | +6 | 4h | Security +20% |
| Security Middleware | HIGH | +3 | 2h | Security +10% |

## Implementation Checklist

### Day 1-2: Content Security Policy (CSP)

#### 1.1 Next.js CSP Configuration

**File**: `apps/client/next.config.mjs` and `apps/admin/next.config.mjs`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://*.supabase.co https://api.openai.com wss://*.supabase.co",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "base-uri 'self'",
              "upgrade-insecure-requests"
            ].join('; ')
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
```

**Testing**:
```bash
# Verify CSP headers
curl -I https://localhost:3000 | grep -i content-security

# Test with browser
npm run dev
# Open DevTools → Network → Check response headers
```

#### 1.2 Gateway Security Middleware

**File**: `apps/gateway/src/middleware/security.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'",
        "https://*.supabase.co",
        "https://api.openai.com",
        "wss://*.supabase.co"
      ],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
});

// Custom security headers
export function customSecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}
```

**Integration**: `apps/gateway/src/server.ts`

```typescript
import express from 'express';
import { securityMiddleware, customSecurityHeaders } from './middleware/security';

const app = express();

// Apply security middleware FIRST
app.use(securityMiddleware);
app.use(customSecurityHeaders);

// ... rest of middleware
```

### Day 3-4: Rate Limiting

#### 2.1 Install Dependencies

```bash
pnpm add express-rate-limit redis ioredis
pnpm add -D @types/express-rate-limit
```

#### 2.2 Redis Rate Limiter

**File**: `apps/gateway/src/middleware/rate-limit.ts`

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  enableOfflineQueue: false
});

// General API rate limiter: 100 requests per 15 minutes
export const generalLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:general:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 900 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() / 1000)
    });
  }
});

// AI endpoint rate limiter: 10 requests per minute
export const aiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:ai:'
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    error: 'AI rate limit exceeded',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

// Auth endpoint rate limiter: 5 requests per 15 minutes
export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many authentication attempts',
    retryAfter: 900
  },
  skipSuccessfulRequests: true, // Don't count successful logins
  standardHeaders: true,
  legacyHeaders: false
});

export { redis };
```

**Integration**: `apps/gateway/src/server.ts`

```typescript
import { generalLimiter, aiLimiter, authLimiter } from './middleware/rate-limit';

// Apply general rate limiting to all routes
app.use('/api/', generalLimiter);

// Specific rate limits
app.use('/api/auth/', authLimiter);
app.use('/api/ai/', aiLimiter);
app.use('/api/knowledge/generate', aiLimiter);
```

#### 2.3 FastAPI Rate Limiting

**File**: `server/middleware/rate_limit.py`

```python
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from redis import asyncio as aioredis
import time
from typing import Callable

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        redis_url: str,
        default_limit: int = 100,
        default_window: int = 900  # 15 minutes
    ):
        super().__init__(app)
        self.redis = aioredis.from_url(redis_url, decode_responses=True)
        self.default_limit = default_limit
        self.default_window = default_window
        
    async def dispatch(self, request: Request, call_next: Callable):
        # Get client IP
        client_ip = request.client.host
        
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/healthz", "/metrics"]:
            return await call_next(request)
        
        # Determine rate limit based on path
        if "/ai/" in request.url.path:
            limit = 10
            window = 60  # 1 minute
        elif "/auth/" in request.url.path:
            limit = 5
            window = 900  # 15 minutes
        else:
            limit = self.default_limit
            window = self.default_window
        
        # Rate limit key
        key = f"rl:{request.url.path}:{client_ip}"
        
        # Get current count
        current = await self.redis.get(key)
        
        if current is None:
            # First request in window
            await self.redis.setex(key, window, 1)
            remaining = limit - 1
        else:
            current = int(current)
            if current >= limit:
                # Rate limit exceeded
                ttl = await self.redis.ttl(key)
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Rate limit exceeded",
                        "retry_after": ttl
                    },
                    headers={
                        "Retry-After": str(ttl),
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(int(time.time()) + ttl)
                    }
                )
            
            # Increment counter
            await self.redis.incr(key)
            remaining = limit - current - 1
        
        # Get TTL
        ttl = await self.redis.ttl(key)
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + ttl)
        
        return response
```

**Integration**: `server/main.py`

```python
from server.middleware.rate_limit import RateLimitMiddleware
import os

# Add rate limiting middleware
app.add_middleware(
    RateLimitMiddleware,
    redis_url=os.getenv("REDIS_URL", "redis://localhost:6379"),
    default_limit=100,
    default_window=900
)
```

### Day 5-6: Database Security & RLS Optimization

#### 3.1 Missing Indexes Migration

**File**: `supabase/migrations/20251202000000_security_indexes.sql`

```sql
-- Performance indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_knowledge_documents_org_status 
  ON knowledge_documents(organization_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assignee_status 
  ON tasks(assignee_id, status) 
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_events_created_at 
  ON activity_events(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified
  ON auth.users(email)
  WHERE email_confirmed_at IS NOT NULL;

-- Composite index for frequent joins
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_members_user_org
  ON organization_members(user_id, organization_id)
  WHERE deleted_at IS NULL;

-- Index for text search (if using pg_trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_title_trgm
  ON knowledge_documents USING gin(title gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_content_trgm
  ON knowledge_documents USING gin(content gin_trgm_ops);

-- Partial index for active sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_active
  ON sessions(user_id, expires_at)
  WHERE expires_at > NOW();

COMMENT ON INDEX idx_knowledge_documents_org_status IS 'Optimizes document listing by org and status';
COMMENT ON INDEX idx_tasks_assignee_status IS 'Optimizes task queries by assignee';
COMMENT ON INDEX idx_activity_events_created_at IS 'Optimizes activity feed queries';
```

#### 3.2 RLS Policy Optimization

**File**: `supabase/migrations/20251202000001_rls_optimization.sql`

```sql
-- Create cached role check function
CREATE OR REPLACE FUNCTION has_min_role_cached(
  p_user_id UUID,
  p_org_id UUID,
  p_min_role TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_cache_key TEXT;
  v_cached_result TEXT;
  v_result BOOLEAN;
BEGIN
  -- Generate cache key
  v_cache_key := 'app.role_cache.' || p_user_id || '.' || p_org_id || '.' || p_min_role;
  
  -- Try to get cached result
  BEGIN
    v_cached_result := current_setting(v_cache_key, true);
    IF v_cached_result IS NOT NULL THEN
      RETURN v_cached_result::BOOLEAN;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Cache miss, continue
  END;
  
  -- Compute result
  v_result := has_min_role(p_user_id, p_org_id, p_min_role);
  
  -- Cache result (transaction-scoped)
  PERFORM set_config(v_cache_key, v_result::TEXT, true);
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Update RLS policies to use cached function
DROP POLICY IF EXISTS select_own_org_documents ON knowledge_documents;

CREATE POLICY select_own_org_documents ON knowledge_documents
  FOR SELECT
  USING (
    has_min_role_cached(
      auth.uid(),
      organization_id,
      'member'
    )
  );

-- Add policy for bulk operations
CREATE POLICY bulk_select_org_documents ON knowledge_documents
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
        AND deleted_at IS NULL
    )
  );

COMMENT ON FUNCTION has_min_role_cached IS 'Cached version of role check for RLS policies';
```

### Day 7: Testing & Validation

#### 4.1 Security Test Suite

**File**: `tests/security/headers.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('Security Headers', () => {
  const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
  
  it('should include CSP headers', async () => {
    const response = await fetch(BASE_URL);
    const csp = response.headers.get('content-security-policy');
    
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });
  
  it('should include security headers', async () => {
    const response = await fetch(BASE_URL);
    
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-xss-protection')).toBe('1; mode=block');
  });
  
  it('should include HSTS header', async () => {
    const response = await fetch(BASE_URL);
    const hsts = response.headers.get('strict-transport-security');
    
    expect(hsts).toContain('max-age=31536000');
    expect(hsts).toContain('includeSubDomains');
  });
});
```

**File**: `tests/security/rate-limit.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('Rate Limiting', () => {
  const API_URL = process.env.API_URL || 'http://localhost:3001';
  
  it('should enforce general rate limit', async () => {
    const promises = Array.from({ length: 101 }, () =>
      fetch(`${API_URL}/api/documents`)
    );
    
    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.status === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
  });
  
  it('should enforce AI rate limit', async () => {
    const promises = Array.from({ length: 11 }, () =>
      fetch(`${API_URL}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test' })
      })
    );
    
    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.status === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
  });
  
  it('should include rate limit headers', async () => {
    const response = await fetch(`${API_URL}/api/documents`);
    
    expect(response.headers.get('x-ratelimit-limit')).toBeTruthy();
    expect(response.headers.get('x-ratelimit-remaining')).toBeTruthy();
    expect(response.headers.get('x-ratelimit-reset')).toBeTruthy();
  });
});
```

#### 4.2 Run Security Audit

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Run security tests
pnpm run test:security

# Check for vulnerabilities
pnpm audit --audit-level=high

# Verify CSP
curl -I http://localhost:3000 | grep -i content-security

# Load test rate limiting
npm install -g artillery
artillery quick --count 150 --num 10 http://localhost:3001/api/documents
```

## Success Criteria

- [ ] All CSP headers implemented and tested
- [ ] Rate limiting active on all endpoints
- [ ] Database indexes created (verify with `EXPLAIN ANALYZE`)
- [ ] RLS policies optimized (<50ms average)
- [ ] Security tests passing
- [ ] No high/critical vulnerabilities in `pnpm audit`
- [ ] Production score: 85/100

## Rollback Plan

If issues arise:

```bash
# Revert CSP (make less strict)
# In next.config.mjs, add 'unsafe-inline' temporarily

# Disable rate limiting
# Comment out middleware in server.ts

# Rollback database migration
psql $DATABASE_URL -c "DROP INDEX CONCURRENTLY idx_knowledge_documents_org_status;"
```

## Next Steps (Week 3)

- Performance optimization (bundle size, code splitting)
- Virtual scrolling implementation
- Caching layer optimization
- Lighthouse score target: 95+
