# Week 2: Security Hardening Implementation Guide
**Timeline:** December 2-8, 2025  
**Status:** Ready to implement  
**Estimated Effort:** 40 hours  
**Team Size:** 2-3 developers

---

## 🎯 Objectives

1. ✅ Implement Content Security Policy (CSP) headers
2. ✅ Add rate limiting to all API endpoints
3. ✅ Harden database security (RLS policies, indexes)
4. ✅ Add API security middleware
5. ✅ Achieve Lighthouse security score 95+

---

## 📋 Day-by-Day Implementation Plan

### Day 1: CSP Headers & Security Middleware (Monday, Dec 2)

#### Task 1.1: Add CSP to Next.js Apps (4 hours)

**File:** `apps/client/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://*.supabase.co",
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
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
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
            value: 'camera=(), microphone=(), geolocation=(self)'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          }
        ],
      },
    ];
  },
  
  // ... rest of config
};

module.exports = nextConfig;
```

**File:** `apps/admin/next.config.js` (same as above)

**Validation:**
```bash
# Test CSP headers
curl -I https://your-app.netlify.app | grep -i "content-security-policy"

# Run Lighthouse security audit
pnpm run lighthouse --only-categories=best-practices
```

---

#### Task 1.2: Create Security Middleware Package (4 hours)

**File:** `packages/security/package.json`

```json
{
  "name": "@prisma-glow/security",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "rate-limit-redis": "^4.2.0",
    "redis": "^4.6.12"
  },
  "devDependencies": {
    "typescript": "^5.7.3",
    "@types/node": "^22.12.0"
  }
}
```

**File:** `packages/security/src/index.ts`

```typescript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import type { Request, Response, NextFunction } from 'express';

export interface SecurityConfig {
  redis?: {
    url: string;
  };
  rateLimit?: {
    windowMs?: number;
    max?: number;
  };
}

export class SecurityMiddleware {
  private redisClient?: ReturnType<typeof createClient>;
  
  constructor(private config: SecurityConfig = {}) {
    if (config.redis) {
      this.redisClient = createClient({ url: config.redis.url });
      this.redisClient.connect();
    }
  }

  /**
   * Helmet security headers
   */
  getHelmetMiddleware() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "https://*.supabase.co", "https://api.openai.com"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 63072000,
        includeSubDomains: true,
        preload: true,
      },
    });
  }

  /**
   * Rate limiting middleware
   */
  getRateLimitMiddleware(options?: { windowMs?: number; max?: number }) {
    const store = this.redisClient
      ? new RedisStore({
          client: this.redisClient,
          prefix: 'rl:',
        })
      : undefined;

    return rateLimit({
      windowMs: options?.windowMs ?? this.config.rateLimit?.windowMs ?? 15 * 60 * 1000, // 15 min
      max: options?.max ?? this.config.rateLimit?.max ?? 100,
      store,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many requests, please try again later.',
    });
  }

  /**
   * Sanitize user input
   */
  sanitizeInput(input: unknown): unknown {
    if (typeof input === 'string') {
      return input
        .replace(/[<>]/g, '') // Remove angle brackets
        .trim()
        .slice(0, 10000); // Max length
    }
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }
    if (typeof input === 'object' && input !== null) {
      return Object.fromEntries(
        Object.entries(input).map(([key, value]) => [
          key,
          this.sanitizeInput(value),
        ])
      );
    }
    return input;
  }

  /**
   * Request sanitization middleware
   */
  sanitizeMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.body) {
        req.body = this.sanitizeInput(req.body);
      }
      if (req.query) {
        req.query = this.sanitizeInput(req.query) as typeof req.query;
      }
      next();
    };
  }

  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

export default SecurityMiddleware;
```

**File:** `packages/security/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

**Setup:**
```bash
cd packages/security
pnpm install
pnpm run build
```

---

### Day 2: Rate Limiting Implementation (Tuesday, Dec 3)

#### Task 2.1: Add Rate Limiting to FastAPI (4 hours)

**File:** `server/requirements.txt` (add):
```
slowapi==0.1.9
redis==5.0.1
```

**File:** `server/middleware/rate_limit.py`

```python
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, Response
from fastapi.responses import JSONResponse
import redis.asyncio as redis
import os

# Initialize Redis client
redis_client = redis.from_url(
    os.getenv("REDIS_URL", "redis://localhost:6379"),
    encoding="utf-8",
    decode_responses=True
)

# Initialize rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=os.getenv("REDIS_URL", "redis://localhost:6379"),
    strategy="fixed-window",
)

def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """Custom handler for rate limit exceeded"""
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "message": str(exc.detail),
            "retry_after": exc.headers.get("Retry-After"),
        },
        headers=exc.headers,
    )

# Rate limit decorators for different endpoint types
def standard_rate_limit():
    """Standard rate limit: 100 requests per 15 minutes"""
    return limiter.limit("100/15minutes")

def ai_rate_limit():
    """AI endpoint rate limit: 10 requests per minute"""
    return limiter.limit("10/minute")

def search_rate_limit():
    """Search endpoint rate limit: 50 requests per minute"""
    return limiter.limit("50/minute")

def write_rate_limit():
    """Write operation rate limit: 30 requests per minute"""
    return limiter.limit("30/minute")
```

**File:** `server/main.py` (update):

```python
from fastapi import FastAPI, Request
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from server.middleware.rate_limit import limiter, rate_limit_exceeded_handler

app = FastAPI(title="Prisma Glow API")

# Add rate limiter to app state
app.state.limiter = limiter

# Add rate limit exception handler
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# ... rest of app setup
```

**Example Usage in Routes:**

```python
from server.middleware.rate_limit import ai_rate_limit, search_rate_limit
from fastapi import Request

@router.post("/ai/generate")
@ai_rate_limit()
async def generate_text(request: Request, payload: GenerateRequest):
    """Generate text with AI (rate limited to 10/min)"""
    # ... implementation
    pass

@router.get("/knowledge/search")
@search_rate_limit()
async def search_knowledge(request: Request, q: str):
    """Search knowledge base (rate limited to 50/min)"""
    # ... implementation
    pass
```

---

#### Task 2.2: Add Rate Limiting to Express Gateway (3 hours)

**File:** `apps/gateway/src/middleware/rate-limit.ts`

```typescript
import { SecurityMiddleware } from '@prisma-glow/security';
import type { Express } from 'express';

export function setupRateLimiting(app: Express) {
  const security = new SecurityMiddleware({
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
  });

  // Global rate limit
  app.use('/api', security.getRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  }));

  // AI endpoint rate limit
  app.use('/api/ai', security.getRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
  }));

  // Search endpoint rate limit
  app.use('/api/knowledge/search', security.getRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 50,
  }));

  // Write operations rate limit
  app.use(['/api/documents', '/api/tasks'], security.getRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
  }));
}
```

**File:** `apps/gateway/src/server.ts` (update):

```typescript
import express from 'express';
import { setupRateLimiting } from './middleware/rate-limit';
import { SecurityMiddleware } from '@prisma-glow/security';

const app = express();
const security = new SecurityMiddleware();

// Security headers
app.use(security.getHelmetMiddleware());

// Input sanitization
app.use(security.sanitizeMiddleware());

// Rate limiting
setupRateLimiting(app);

// ... rest of server setup
```

---

### Day 3: Database Security Hardening (Wednesday, Dec 4)

#### Task 3.1: Add Missing Database Indexes (3 hours)

**File:** `supabase/migrations/20251204000000_add_performance_indexes.sql`

```sql
-- Knowledge documents indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_knowledge_documents_org_status 
  ON knowledge_documents(organization_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_knowledge_documents_embedding 
  ON knowledge_documents USING ivfflat(embedding vector_cosine_ops)
  WITH (lists = 100);

-- Tasks indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assignee_status 
  ON tasks(assignee_id, status) 
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_due_date 
  ON tasks(due_date) 
  WHERE status != 'completed' AND deleted_at IS NULL;

-- Activity events indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_events_created_at 
  ON activity_events(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_events_org_type 
  ON activity_events(organization_id, event_type, created_at DESC);

-- User profiles indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_email 
  ON user_profiles(email) 
  WHERE deleted_at IS NULL;

-- Analyze tables to update statistics
ANALYZE knowledge_documents;
ANALYZE tasks;
ANALYZE activity_events;
ANALYZE user_profiles;
```

**Apply Migration:**
```bash
supabase db push
```

---

#### Task 3.2: Optimize RLS Policies with Caching (4 hours)

**File:** `supabase/migrations/20251204000001_optimize_rls_policies.sql`

```sql
-- Create cached role check function
CREATE OR REPLACE FUNCTION has_min_role_cached(
  p_user_id UUID,
  p_org_id UUID,
  p_min_role TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_cache_key TEXT;
  v_result BOOLEAN;
BEGIN
  -- Generate cache key
  v_cache_key := 'role_cache.' || p_user_id || '.' || p_org_id || '.' || p_min_role;
  
  -- Try to get from session cache
  BEGIN
    v_result := current_setting(v_cache_key, true)::BOOLEAN;
    IF v_result IS NOT NULL THEN
      RETURN v_result;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- Compute role check
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.user_id = p_user_id
      AND om.organization_id = p_org_id
      AND om.role >= p_min_role::user_role
      AND om.deleted_at IS NULL
  ) INTO v_result;
  
  -- Cache result for this session
  PERFORM set_config(v_cache_key, v_result::TEXT, false);
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Update RLS policies to use cached function
DROP POLICY IF EXISTS "Users can view org documents" ON knowledge_documents;
CREATE POLICY "Users can view org documents" ON knowledge_documents
  FOR SELECT
  USING (
    has_min_role_cached(auth.uid(), organization_id, 'member')
  );

DROP POLICY IF EXISTS "Users can create org documents" ON knowledge_documents;
CREATE POLICY "Users can create org documents" ON knowledge_documents
  FOR INSERT
  WITH CHECK (
    has_min_role_cached(auth.uid(), organization_id, 'member')
  );

DROP POLICY IF EXISTS "Admins can update org documents" ON knowledge_documents;
CREATE POLICY "Admins can update org documents" ON knowledge_documents
  FOR UPDATE
  USING (
    has_min_role_cached(auth.uid(), organization_id, 'admin')
  );
```

---

### Day 4: API Security Middleware (Thursday, Dec 5)

#### Task 4.1: CORS Hardening (2 hours)

**File:** `server/middleware/cors.py`

```python
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from typing import List
import os

def get_allowed_origins() -> List[str]:
    """Get allowed CORS origins from environment"""
    env_origins = os.getenv("ALLOWED_ORIGINS", "")
    if env_origins:
        return env_origins.split(",")
    
    # Default for development
    if os.getenv("ENVIRONMENT") == "development":
        return [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
        ]
    
    # Production origins
    return [
        "https://prisma-glow.netlify.app",
        "https://www.prisma-glow.com",
        "https://prisma-glow.com",
    ]

def setup_cors(app):
    """Configure CORS middleware"""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_allowed_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID", "X-RateLimit-Remaining"],
        max_age=86400,  # 24 hours
    )

def setup_trusted_hosts(app):
    """Configure trusted host middleware"""
    allowed_hosts = os.getenv("ALLOWED_HOSTS", "*").split(",")
    
    if "*" not in allowed_hosts:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=allowed_hosts,
        )
```

**File:** `server/main.py` (update):

```python
from server.middleware.cors import setup_cors, setup_trusted_hosts

app = FastAPI()

# Setup security middleware
setup_cors(app)
setup_trusted_hosts(app)
```

---

#### Task 4.2: Request Size Limits & Validation (3 hours)

**File:** `server/middleware/validation.py`

```python
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import time

class RequestValidationMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_body_size: int = 10 * 1024 * 1024):  # 10MB default
        super().__init__(app)
        self.max_body_size = max_body_size

    async def dispatch(self, request: Request, call_next):
        # Check request size
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_body_size:
            return JSONResponse(
                status_code=413,
                content={"error": "Request body too large"},
            )

        # Add request ID
        request_id = request.headers.get("X-Request-ID", f"req_{int(time.time() * 1000)}")
        
        # Process request
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        
        return response
```

---

### Day 5: Testing & Validation (Friday, Dec 6)

#### Task 5.1: Security Testing (4 hours)

**File:** `tests/security/test_headers.py`

```python
import pytest
from fastapi.testclient import TestClient
from server.main import app

client = TestClient(app)

def test_security_headers():
    """Test that all security headers are present"""
    response = client.get("/health")
    
    assert response.status_code == 200
    
    # Check security headers
    assert "X-Content-Type-Options" in response.headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    
    assert "X-Frame-Options" in response.headers
    assert response.headers["X-Frame-Options"] == "DENY"

def test_rate_limiting():
    """Test that rate limiting works"""
    # Make 11 requests quickly (limit is 10/min for AI endpoints)
    responses = []
    for _ in range(11):
        responses.append(client.post("/api/ai/generate", json={"prompt": "test"}))
    
    # Last request should be rate limited
    assert responses[-1].status_code == 429
    assert "Retry-After" in responses[-1].headers

def test_cors():
    """Test CORS configuration"""
    response = client.options(
        "/api/documents",
        headers={"Origin": "https://prisma-glow.netlify.app"}
    )
    
    assert "Access-Control-Allow-Origin" in response.headers
    assert response.headers["Access-Control-Allow-Credentials"] == "true"
```

**Run Tests:**
```bash
pytest tests/security/ -v
```

---

#### Task 5.2: Lighthouse Audit (2 hours)

**File:** `scripts/security/lighthouse-audit.sh`

```bash
#!/bin/bash

echo "Running Lighthouse security audit..."

# Client app
lighthouse https://your-client-app.netlify.app \
  --only-categories=best-practices \
  --output=json \
  --output-path=./lighthouse-client.json

# Admin app
lighthouse https://your-admin-app.netlify.app \
  --only-categories=best-practices \
  --output=json \
  --output-path=./lighthouse-admin.json

# Parse results
node scripts/security/parse-lighthouse.js
```

**File:** `scripts/security/parse-lighthouse.js`

```javascript
const fs = require('fs');

const clientReport = JSON.parse(fs.readFileSync('./lighthouse-client.json'));
const adminReport = JSON.parse(fs.readFileSync('./lighthouse-admin.json'));

console.log('\n=== Lighthouse Security Audit ===\n');

console.log('Client App:');
console.log(`  Best Practices Score: ${clientReport.categories['best-practices'].score * 100}/100`);

console.log('\nAdmin App:');
console.log(`  Best Practices Score: ${adminReport.categories['best-practices'].score * 100}/100`);

// Check for specific security audits
const securityAudits = [
  'is-on-https',
  'uses-http2',
  'no-vulnerable-libraries',
  'csp-xss',
];

console.log('\nSecurity Checks:');
securityAudits.forEach(auditId => {
  const clientAudit = clientReport.audits[auditId];
  if (clientAudit) {
    console.log(`  ${clientAudit.title}: ${clientAudit.score === 1 ? '✅' : '❌'}`);
  }
});
```

---

### Day 6-7: Documentation & Deployment (Weekend, Dec 7-8)

#### Task 6.1: Update Documentation (3 hours)

**File:** `docs/security/SECURITY_POLICY.md`

```markdown
# Security Policy

## Implemented Security Measures

### 1. Content Security Policy (CSP)
- All apps enforce strict CSP headers
- Inline scripts/styles allowed only where necessary
- External resources whitelisted

### 2. Rate Limiting
- Global: 100 req/15min
- AI endpoints: 10 req/min
- Search: 50 req/min
- Write operations: 30 req/min

### 3. Database Security
- Row Level Security (RLS) on all tables
- Cached role checks for performance
- Comprehensive indexes for query optimization

### 4. API Security
- CORS whitelisting
- Trusted host validation
- Request size limits (10MB)
- Input sanitization

## Reporting Vulnerabilities

Email: security@prisma-glow.com
PGP Key: [link]
```

---

#### Task 6.2: Deploy to Staging (2 hours)

```bash
# 1. Run all tests
pnpm run test
pytest tests/security/

# 2. Build all apps
pnpm run build

# 3. Deploy to staging
netlify deploy --prod=false --dir=dist/client
netlify deploy --prod=false --dir=dist/admin

# 4. Run smoke tests
curl -I https://staging.prisma-glow.netlify.app | grep -i security
```

---

## 📊 Success Criteria

- [ ] All security headers present and correct
- [ ] Rate limiting functional on all endpoints
- [ ] Database indexes created and analyzed
- [ ] RLS policies optimized with caching
- [ ] CORS properly configured
- [ ] Lighthouse security score 95+
- [ ] All security tests passing
- [ ] Documentation updated

---

## 🚨 Rollback Plan

If issues arise:

1. Revert Next.js config changes
2. Disable rate limiting middleware
3. Restore original RLS policies
4. Deploy previous version

```bash
git revert HEAD~10..HEAD
pnpm run build
netlify deploy --prod
```

---

## 📞 Support

- Security questions: security@prisma-glow.com
- Implementation help: dev@prisma-glow.com
- Emergency: +1-XXX-XXX-XXXX

---

**Last Updated:** November 28, 2025  
**Next Review:** December 9, 2025 (Week 3 kickoff)
