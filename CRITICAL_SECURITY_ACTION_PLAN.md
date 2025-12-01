# CRITICAL SECURITY ISSUES - ACTION PLAN
## Immediate Actions Required Before Go-Live

**Created:** 2025-12-01  
**Priority:** 🚨 CRITICAL  
**Deadline:** Before Production Deployment  

---

## ✅ COMPLETED FIXES (Ready for Testing)

### 1. Gateway Authentication & Authorization ✅
**Files Changed:**
- ✅ `apps/gateway/src/middleware/auth.ts` - NEW
- ✅ `apps/gateway/src/middleware/rateLimit.ts` - NEW
- ✅ `apps/gateway/src/index.ts` - UPDATED
- ✅ `apps/gateway/package.json` - UPDATED

**What Was Fixed:**
- All `/api/v1` routes now require valid Supabase JWT
- Organization context extracted from token for multi-tenant isolation
- CORS restricted to explicitly allowed origins
- Rate limiting: 100 req/15min per IP

**Testing Required:**
```bash
# 1. Install new dependencies
cd apps/gateway
pnpm install

# 2. Build
pnpm run build

# 3. Test unauthenticated request (should fail)
curl http://localhost:3001/api/v1/agents
# Expected: 401 Unauthorized

# 4. Test with valid token (should succeed)
curl -H "Authorization: Bearer YOUR_SUPABASE_JWT" \\
  http://localhost:3001/api/v1/agents
# Expected: 200 OK with agents data
```

---

## ⏳ PENDING ACTIONS (Require Manual Work)

### 1. 🔴 CRITICAL: Configure Production Environment Variables

**Deadline:** Before deployment  
**Owner:** DevOps Team  

**Required Variables:**

#### Gateway Service
```bash
# apps/gateway/.env or docker-compose env
GATEWAY_ALLOWED_ORIGINS=https://app.prismaglow.com,https://staging.prismaglow.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_JWT_AUDIENCE=authenticated
NODE_ENV=production
```

#### FastAPI Service (verify these are set)
```bash
# server/.env or docker-compose env
API_ALLOWED_ORIGINS=https://app.prismaglow.com,https://staging.prismaglow.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_JWT_AUDIENCE=authenticated
ENVIRONMENT=production
```

**How to Get JWT Secret:**
1. Go to Supabase Dashboard → Project Settings → API
2. Copy "JWT Secret" under "Config"
3. Set as `SUPABASE_JWT_SECRET`

**Verification:**
```bash
# Gateway should fail to start if GATEWAY_ALLOWED_ORIGINS not set
docker-compose up gateway
# Should see error: "GATEWAY_ALLOWED_ORIGINS must be set in production"
```

---

### 2. 🔴 CRITICAL: Resolve Authentication Architecture Conflict

**Deadline:** Week 1  
**Owner:** Architecture Team  

**Problem:**
- Vite SPA (`src/`) uses Supabase Auth directly
- Next.js app (`apps/web/`) has traces of NextAuth/Keycloak setup
- No session synchronization between apps

**Decision Required:**

#### Option A: Unify on Supabase Auth (Recommended)
**Pros:**
- Already working in Vite SPA
- Simpler architecture
- Native RLS support
- Lower maintenance

**Cons:**
- Limited to Supabase OAuth providers
- Vendor lock-in

**Implementation:**
1. Remove all NextAuth references from `apps/web/`
2. Use `@supabase/ssr` for Next.js server components
3. Share session via cookies
4. Test cross-app navigation

**Effort:** 2-3 days

---

#### Option B: Migrate to NextAuth
**Pros:**
- Flexible OAuth providers
- Better Next.js integration
- Industry standard

**Cons:**
- More complex setup
- Need to configure Supabase as custom provider
- Migration work for Vite SPA

**Implementation:**
1. Set up NextAuth in `apps/web/`
2. Configure Supabase as OAuth provider
3. Update Vite SPA to use NextAuth session
4. Implement session sync mechanism

**Effort:** 5-7 days

---

**Action Items:**
- [ ] Decision: Choose Option A or B (by Dec 5)
- [ ] Create implementation plan
- [ ] Implement unified auth flow
- [ ] Test session persistence
- [ ] Update documentation

---

### 3. 🟡 HIGH: Complete TODO Implementations

**Deadline:** Week 2  
**Owner:** Backend Team  

**Critical TODOs to Complete:**

#### Agent CRUD Operations (BLOCKER)
```python
# server/api/agents.py
# Lines 74, 128 - Replace mock Supabase queries with actual implementation
```

**Status:** Mock implementations in place  
**Impact:** Agent management non-functional  
**Effort:** 1-2 days  

**Action:**
- [ ] Implement actual Supabase queries for agent CRUD
- [ ] Add RLS policies for multi-tenant isolation
- [ ] Test with multiple organizations
- [ ] Add integration tests

---

#### Learning Examples Storage
```python
# server/api/executions.py:366
# TODO: Insert into agent_learning_examples
```

**Status:** Placeholder code  
**Impact:** AI learning system non-functional  
**Effort:** 1 day  

**Action:**
- [ ] Implement learning examples storage
- [ ] Add schema migration if needed
- [ ] Test learning loop
- [ ] Add monitoring

---

#### Vector Store Endpoints (11 TODOs)
```python
# server/api/vector_stores.py
# Lines 50, 63, 79, 92, 105, 125, 141, 158, 174, 187, 207
# TODO: Migrate from main.py
```

**Status:** Not migrated  
**Impact:** RAG/knowledge management broken  
**Effort:** 2-3 days  

**Action:**
- [ ] Complete migration from `main.py`
- [ ] Test vector search functionality
- [ ] Add error handling
- [ ] Document API endpoints

---

#### Document Endpoints
```python
# server/api/documents.py
# Lines 39, 52, 65
# TODO: Migrate from main.py
```

**Status:** Not migrated  
**Impact:** Document processing broken  
**Effort:** 1 day  

**Action:**
- [ ] Migrate document endpoints
- [ ] Test file uploads
- [ ] Add security validation
- [ ] Test with large files

---

### 4. 🟡 HIGH: Enable Production Error Tracking

**Deadline:** Week 2  
**Owner:** DevOps Team  

**Problem:**
```typescript
// src/components/error-boundary.tsx
if (import.meta.env.PROD) {
  // window.Sentry?.captureException(error, { extra: errorInfo });
  // ^^^ COMMENTED OUT!
}
```

**Action:**
1. Uncomment Sentry integration:
```typescript
if (import.meta.env.PROD && window.Sentry) {
  window.Sentry.captureException(error, { extra: errorInfo });
}
```

2. Configure environment:
```bash
# .env.production
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=prisma-glow
SENTRY_PROJECT=client
```

3. Test in staging:
```bash
# Trigger test error
throw new Error('Sentry test error');
# Verify appears in Sentry dashboard
```

**Checklist:**
- [ ] Uncomment Sentry code in error-boundary.tsx
- [ ] Set `NEXT_PUBLIC_SENTRY_DSN`
- [ ] Deploy to staging
- [ ] Trigger test error
- [ ] Verify in Sentry dashboard
- [ ] Enable in production

---

### 5. 🟡 HIGH: Migrate PWA Queue to IndexedDB

**Deadline:** Week 3  
**Owner:** Frontend Team  

**Problem:**
PWA offline queue using localStorage (5-10MB limit)

**Solution:**
```typescript
import { openDB } from 'idb';

const db = await openDB('prisma-glow-pwa', 1, {
  upgrade(db) {
    db.createObjectStore('offline-queue', { 
      keyPath: 'id',
      autoIncrement: true 
    });
  },
});

// Add to queue
await db.add('offline-queue', {
  timestamp: Date.now(),
  action: 'create_agent',
  payload: { /* ... */ }
});

// Process queue
const items = await db.getAll('offline-queue');
```

**Checklist:**
- [ ] Install `idb` package
- [ ] Create IndexedDB wrapper
- [ ] Migrate queue operations
- [ ] Test offline sync
- [ ] Add queue size monitoring

---

### 6. 🟢 MEDIUM: Documentation Cleanup

**Deadline:** Week 4  
**Owner:** Documentation Team  

**Problem:** 200+ markdown files at root level

**Action:**
```bash
# Create archive
mkdir -p docs/archive

# Move old docs
mv AGENT_LEARNING_*.md docs/archive/
mv IMPLEMENTATION_*_OLD.md docs/archive/
mv START_HERE_OLD*.md docs/archive/

# Keep only:
# - README.md (main entry point)
# - START_HERE.md (quick start)
# - CONTRIBUTING.md
# - SECURITY.md
```

**Checklist:**
- [ ] Create `docs/archive/` directory
- [ ] Move duplicates to archive
- [ ] Create single `START_HERE.md`
- [ ] Update README.md with clear structure
- [ ] Add `docs/README.md` as index

---

## 📊 PROGRESS TRACKER

| Task | Status | Priority | Owner | Deadline | Progress |
|------|--------|----------|-------|----------|----------|
| Gateway Auth Middleware | ✅ Done | 🔴 Critical | Completed | Dec 1 | 100% |
| CORS Configuration | ✅ Done | 🔴 Critical | Completed | Dec 1 | 100% |
| Rate Limiting | ✅ Done | 🔴 Critical | Completed | Dec 1 | 100% |
| Env Var Configuration | ⏳ Pending | 🔴 Critical | DevOps | Dec 5 | 0% |
| Auth Architecture Decision | ⏳ Pending | 🔴 Critical | Arch Team | Dec 5 | 0% |
| Agent CRUD Implementation | ⏳ Pending | 🟡 High | Backend | Dec 8 | 0% |
| Vector Store Migration | ⏳ Pending | 🟡 High | Backend | Dec 10 | 0% |
| Sentry Integration | ⏳ Pending | 🟡 High | DevOps | Dec 8 | 0% |
| PWA IndexedDB Migration | ⏳ Pending | 🟡 High | Frontend | Dec 15 | 0% |
| Documentation Cleanup | ⏳ Pending | 🟢 Medium | Docs | Dec 22 | 0% |

---

## 🧪 TESTING PLAN

### Phase 1: Component Testing (Week 1)
- [ ] Gateway auth middleware unit tests
- [ ] Rate limiting tests
- [ ] CORS origin validation tests
- [ ] JWT verification tests

### Phase 2: Integration Testing (Week 2)
- [ ] End-to-end auth flow (Vite → Gateway → FastAPI)
- [ ] Multi-tenant isolation tests
- [ ] Session persistence across apps
- [ ] Error boundary + Sentry integration

### Phase 3: Security Testing (Week 3)
- [ ] Penetration testing
- [ ] CORS bypass attempts
- [ ] Rate limit bypass tests
- [ ] RLS policy verification
- [ ] SQL injection tests

### Phase 4: Load Testing (Week 3)
- [ ] 1000 concurrent users
- [ ] Rate limit under load
- [ ] Database connection pooling
- [ ] Cache performance

---

## 🚀 DEPLOYMENT PLAN

### Staging Deployment (Week 2)
```bash
# 1. Update gateway
cd apps/gateway
pnpm install
pnpm run build
docker build -t prisma-gateway:latest .

# 2. Update environment
cp .env.staging .env

# 3. Deploy
docker-compose -f docker-compose.staging.yml up -d gateway

# 4. Smoke test
curl -H "Authorization: Bearer $STAGING_JWT" \\
  https://staging-api.prismaglow.com/api/v1/health
```

### Production Deployment (Week 3)
```bash
# 1. Backup current deployment
docker-compose -f docker-compose.prod.yml down
docker commit prisma-gateway prisma-gateway:backup-$(date +%Y%m%d)

# 2. Deploy new version
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 3. Health check
curl https://api.prismaglow.com/health

# 4. Monitor errors
tail -f /var/log/gateway/error.log

# 5. Rollback if needed
docker-compose -f docker-compose.prod.yml down
docker tag prisma-gateway:backup-$(date +%Y%m%d) prisma-gateway:latest
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📞 ESCALATION

**Critical Issues:** Slack #incidents  
**Security Issues:** security@prismaglow.com  
**Production Issues:** oncall@prismaglow.com  

**On-Call Rotation:**
- Week 1: Backend Team
- Week 2: DevOps Team
- Week 3: Full Team

---

## 📚 REFERENCES

- [Security Fixes Report](SECURITY_FIXES_IMPLEMENTATION_REPORT.md)
- [Gateway Auth Middleware](apps/gateway/src/middleware/auth.ts)
- [Environment Guide](ENV_GUIDE.md)
- [Production Readiness](PRODUCTION_READINESS_CHECKLIST.md)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)

---

**Last Updated:** 2025-12-01  
**Next Review:** 2025-12-05  
**Status:** IN PROGRESS
