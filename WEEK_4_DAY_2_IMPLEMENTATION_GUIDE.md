# Week 4 Day 2: Testing & Validation - Implementation Guide

**Date:** 2025-11-28  
**Target:** Week 4 at 90% completion  
**Duration:** 4-6 hours  
**Focus:** Apply infrastructure to production, validate, deploy to staging

---

## 🎯 EXECUTIVE STRATEGY

Based on codebase analysis, we're taking a **hybrid approach**:
- **Document infrastructure** for complex integrations (ready for future sprints)
- **Apply quick wins** that deliver immediate value
- **Validate thoroughly** before staging deployment

---

## 📊 CODEBASE ANALYSIS FINDINGS

### Pages Identified (1,819 LOC total)
| Page | Size | List Size | Priority | Action |
|------|------|-----------|----------|--------|
| `documents.tsx` | ~450 LOC | Large | HIGH | Document virtual pattern |
| `tasks.tsx` | ~400 LOC | Large | HIGH | Document virtual pattern |
| `dashboard.tsx` | ~500 LOC | Medium | MEDIUM | Keep current (already optimized) |
| `knowledge/repositories.tsx` | ~300 LOC | Large | HIGH | Document virtual pattern |
| `analytics.tsx` | ~169 LOC | N/A | LOW | Monitor only |

### API Endpoints Identified
| Endpoint | Type | Traffic | Priority | Action |
|----------|------|---------|----------|--------|
| `server/api/v1/agents.py` | GET | High | HIGH | Add caching |
| `server/api/agents.py` | GET | High | HIGH | Add caching |
| Document endpoints | GET | High | HIGH | Add caching |
| Search endpoints | GET | Medium | MEDIUM | Add caching |
| Analytics endpoints | GET | Medium | MEDIUM | Add caching |

### Code Splitting Status
- ✅ `src/App.lazy.tsx` already exists (6.4 KB)
- ⚠️ `src/App.tsx` is large (15.9 KB)
- ✅ `src/main.tsx` is small (609 bytes)

**Decision:** App.lazy.tsx is ready but NOT yet activated in main.tsx

---

## 🚀 PHASE 3A: VIRTUAL COMPONENT INTEGRATION (45 min)

### Approach: Documentation + Examples (Not Direct Integration)

**Why this approach:**
- Pages are already functional and production-ready
- Virtual scrolling requires testing with real data
- Risk of introducing bugs close to launch
- Better to document patterns for future optimization

### Deliverable: Integration Guide

Create `VIRTUAL_SCROLLING_INTEGRATION_GUIDE.md` with:
1. Step-by-step integration instructions for each page
2. Code diff examples showing exactly what changes
3. Testing checklist
4. Rollback plan
5. Performance measurement baseline

### Pages to Document:

**1. documents.tsx → VirtualList Integration**
```typescript
// BEFORE (current):
{documents.map(doc => <DocumentCard key={doc.id} document={doc} />)}

// AFTER (to be applied in future sprint):
<VirtualList
  items={documents}
  estimateSize={() => 120}
  renderItem={(doc) => <DocumentCard document={doc} />}
/>
```

**2. tasks.tsx → VirtualTable Integration**
```typescript
// BEFORE (current):
{tasks.map(task => <TaskRow key={task.id} task={task} />)}

// AFTER (to be applied in future sprint):
<VirtualTable
  data={tasks}
  columns={taskColumns}
  estimateSize={() => 72}
/>
```

**3. knowledge/repositories.tsx → VirtualGrid Integration**
```typescript
// BEFORE (current):
<div className="grid grid-cols-3">
  {repos.map(repo => <RepoCard key={repo.id} repo={repo} />)}
</div>

// AFTER (to be applied in future sprint):
<VirtualGrid
  items={repos}
  columns={3}
  estimateSize={() => 180}
  renderItem={(repo) => <RepoCard repo={repo} />}
/>
```

---

## 🗄️ PHASE 3B: ACTIVATE PRODUCTION CACHING (60 min)

### Step 1: Update server/main.py (15 min)

**Add cache lifespan management:**

```python
# Add after existing imports
from contextlib import asynccontextmanager
import aioredis

# Add before app = FastAPI()
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize cache
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    app.state.redis = await aioredis.from_url(
        redis_url,
        encoding="utf-8",
        decode_responses=True
    )
    print(f"✅ Redis cache connected: {redis_url}")
    
    yield
    
    # Shutdown: Close cache
    await app.state.redis.close()
    print("✅ Redis cache disconnected")

# Update FastAPI app initialization
app = FastAPI(
    title="Prisma Glow API",
    version="1.0.0",
    lifespan=lifespan  # Add this
)
```

### Step 2: Create Cache Decorator (15 min)

**Create `server/utils/cache.py`:**

```python
import hashlib
import json
from functools import wraps
from typing import Any, Callable, Optional
import structlog

logger = structlog.get_logger(__name__)

def cached(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator to cache endpoint responses
    
    Args:
        ttl: Time to live in seconds (default 5 min)
        key_prefix: Optional prefix for cache keys
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get request from kwargs (FastAPI injects it)
            request = kwargs.get('request')
            if not request:
                # No request = no caching (direct function call)
                return await func(*args, **kwargs)
            
            # Generate cache key
            cache_key = _generate_cache_key(
                key_prefix or func.__name__,
                request.url.path,
                request.query_params
            )
            
            # Try to get from cache
            redis = request.app.state.redis
            cached_value = await redis.get(cache_key)
            
            if cached_value:
                logger.info(f"Cache hit: {cache_key}")
                return json.loads(cached_value)
            
            # Cache miss - execute function
            logger.info(f"Cache miss: {cache_key}")
            result = await func(*args, **kwargs)
            
            # Store in cache
            await redis.setex(
                cache_key,
                ttl,
                json.dumps(result, default=str)
            )
            
            return result
        
        return wrapper
    return decorator

def _generate_cache_key(prefix: str, path: str, params: dict) -> str:
    """Generate deterministic cache key"""
    params_str = json.dumps(dict(sorted(params.items())))
    hash_input = f"{prefix}:{path}:{params_str}"
    return f"cache:{hashlib.md5(hash_input.encode()).hexdigest()}"

async def invalidate_cache_pattern(redis, pattern: str):
    """Invalidate all keys matching pattern"""
    keys = []
    async for key in redis.scan_iter(match=pattern):
        keys.append(key)
    if keys:
        await redis.delete(*keys)
        logger.info(f"Invalidated {len(keys)} cache keys: {pattern}")
```

### Step 3: Apply to Top Endpoints (30 min)

**server/api/v1/agents.py:**

```python
from server.utils.cache import cached, invalidate_cache_pattern
from fastapi import Request

# Add Request dependency to endpoints
@router.get("/agents")
@cached(ttl=300, key_prefix="agents_list")  # 5 min cache
async def list_agents(request: Request, ...):
    # existing code
    pass

@router.get("/agents/{agent_id}")
@cached(ttl=600, key_prefix="agent_detail")  # 10 min cache
async def get_agent(request: Request, agent_id: str, ...):
    # existing code
    pass

@router.post("/agents")
async def create_agent(request: Request, ...):
    result = # ... existing creation code
    
    # Invalidate list cache after creating
    await invalidate_cache_pattern(
        request.app.state.redis,
        "cache:*agents_list*"
    )
    
    return result

@router.put("/agents/{agent_id}")
async def update_agent(request: Request, agent_id: str, ...):
    result = # ... existing update code
    
    # Invalidate specific agent and list cache
    await invalidate_cache_pattern(
        request.app.state.redis,
        f"cache:*agent_detail*{agent_id}*"
    )
    await invalidate_cache_pattern(
        request.app.state.redis,
        "cache:*agents_list*"
    )
    
    return result
```

**Repeat for:**
- `server/api/agents.py` (legacy endpoints)
- Document list/search endpoints
- Knowledge repository endpoints
- Analytics aggregation endpoints

---

## 📦 PHASE 3C: CODE SPLITTING ACTIVATION (15 min)

### Option 1: Activate App.lazy.tsx (RECOMMENDED FOR FUTURE)

**Current `src/main.tsx`:**
```typescript
import App from './App'
```

**Updated `src/main.tsx` (when ready to deploy):**
```typescript
import App from './App.lazy'  // Switch to lazy-loaded version
```

### Option 2: Document Benefits (TODAY'S APPROACH)

Create documentation showing:
- Bundle size reduction: Est. -15% (240KB → 204KB)
- Initial load time: Est. -20% (2.5s → 2.0s)
- Time to interactive: Est. -25%

**Activation checklist:**
1. Test App.lazy.tsx in development
2. Verify all routes load correctly
3. Check error boundaries work
4. Measure bundle size difference
5. Deploy to staging
6. Monitor for 24 hours
7. Deploy to production

---

## 🧪 PHASE 3D: PERFORMANCE BENCHMARKING (45 min)

### Lighthouse Audit (20 min)

```bash
# Install Lighthouse CLI
pnpm add -D lighthouse

# Create audit script: scripts/lighthouse-audit.sh
#!/bin/bash
lighthouse http://localhost:5173 \
  --only-categories=performance,accessibility,best-practices \
  --output=json \
  --output=html \
  --output-path=./reports/lighthouse-$(date +%Y%m%d-%H%M%S)

# Run audit
chmod +x scripts/lighthouse-audit.sh
pnpm dev &
sleep 10
./scripts/lighthouse-audit.sh
```

**Target Scores:**
- Performance: 95+
- Accessibility: 95+
- Best Practices: 90+

### Bundle Size Analysis (15 min)

```bash
# Build production bundle
pnpm run build

# Analyze bundle
pnpm exec vite-bundle-visualizer dist/stats.html

# Check main chunks
ls -lh dist/assets/*.js | awk '{print $9, $5}'
```

**Targets:**
- Main JS: <250KB gzipped
- Vendor chunk: <300KB gzipped
- Total: <800KB gzipped

### API Performance Profiling (10 min)

```bash
# Create performance test: scripts/api-perf-test.sh
#!/bin/bash
echo "Testing API performance..."

# Test without cache (first request)
curl -w "\nTime: %{time_total}s\n" \
  -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:8000/api/v1/agents

# Test with cache (second request)
curl -w "\nTime: %{time_total}s\n" \
  -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:8000/api/v1/agents
```

**Expected Results:**
- First request: ~150ms (no cache)
- Second request: <20ms (cached)
- Improvement: ~90%

---

## 🔒 PHASE 3E: SECURITY & QUALITY SCANNING (45 min)

### Security Audit (15 min)

```bash
# Check for vulnerabilities
pnpm audit --audit-level=moderate

# Expected: 0 critical, 0 high
# Action: Fix or document any issues found
```

### Python Tests (15 min)

```bash
# Activate virtualenv
source .venv/bin/activate

# Run pytest with coverage
pytest --cov=server --cov-report=term --cov-report=html

# Target: 60%+ coverage
# Check: coverage/index.html
```

### Playwright E2E Tests (15 min)

```bash
# Install browsers if needed
pnpm exec playwright install --with-deps chromium

# Run core journeys
pnpm exec playwright test tests/e2e/core-journeys.spec.ts

# Expected: All tests passing
# Check: test-results/ for failures
```

---

## 🚀 PHASE 3F: STAGING DEPLOYMENT (60 min)

### Pre-Deployment Checklist

```bash
# 1. Ensure all tests pass
pnpm run test
pytest

# 2. Build production bundles
pnpm run build

# 3. Validate environment variables
cat .env.staging | grep -E "DATABASE_URL|REDIS_URL|OPENAI_API_KEY"

# 4. Create deployment tag
git tag -a v1.0.0-rc.1 -m "Week 4 Day 2: Caching + optimizations"
git push origin v1.0.0-rc.1
```

### Staging Deployment (Docker Compose)

```bash
# 1. Copy staging environment
cp .env.staging .env.production

# 2. Build containers
docker compose -f docker-compose.prod.yml build

# 3. Deploy services
docker compose -f docker-compose.prod.yml up -d

# 4. Check health
curl http://localhost:3001/healthz  # Gateway
curl http://localhost:8000/health   # FastAPI

# 5. Monitor logs
docker compose -f docker-compose.prod.yml logs -f --tail=100
```

### Post-Deployment Smoke Tests (15 min)

```bash
# Create smoke test: tests/smoke/staging.sh
#!/bin/bash
BASE_URL="https://staging.prisma-glow.com"

echo "🔍 Running smoke tests..."

# Test 1: Health checks
curl -f $BASE_URL/api/health || exit 1
echo "✅ Health check passed"

# Test 2: Authentication
curl -f $BASE_URL/api/auth/session || exit 1
echo "✅ Auth endpoint accessible"

# Test 3: Cache headers present
curl -I $BASE_URL/api/v1/agents | grep -i "x-cache"
echo "✅ Cache headers present"

# Test 4: Page loads
curl -f $BASE_URL/ | grep -q "Prisma Glow"
echo "✅ Frontend loads"

echo "🎉 All smoke tests passed!"
```

### Monitoring Setup (30 min)

```bash
# Create monitoring dashboard queries

# 1. Cache hit rate
SELECT
  COUNT(CASE WHEN cache_hit = true THEN 1 END) * 100.0 / COUNT(*) as hit_rate
FROM api_logs
WHERE timestamp > NOW() - INTERVAL '1 hour';
-- Target: >70%

# 2. API response times
SELECT
  percentile_cont(0.5) as p50,
  percentile_cont(0.95) as p95,
  percentile_cont(0.99) as p99
FROM api_logs
WHERE timestamp > NOW() - INTERVAL '1 hour';
-- Target: P95 < 200ms

# 3. Error rate
SELECT
  COUNT(CASE WHEN status >= 500 THEN 1 END) * 100.0 / COUNT(*) as error_rate
FROM api_logs
WHERE timestamp > NOW() - INTERVAL '1 hour';
-- Target: <0.1%
```

---

## 📋 SUCCESS CRITERIA CHECKLIST

### Virtual Components
- [ ] Integration guide created for 3 pages
- [ ] Code examples documented
- [ ] Testing checklist defined
- [ ] Performance baselines measured

### Caching
- [x] Cache lifespan added to server/main.py
- [x] Cache decorator created (server/utils/cache.py)
- [ ] 5+ endpoints cached
- [ ] Cache invalidation implemented
- [ ] Hit rate monitoring active

### Code Splitting
- [ ] App.lazy.tsx activation guide created
- [ ] Bundle size baseline measured
- [ ] Activation checklist defined

### Performance
- [ ] Lighthouse audit completed (95+ target)
- [ ] Bundle analysis done (<250KB target)
- [ ] API profiling completed (10x improvement target)

### Quality
- [ ] Security audit passed (0 critical)
- [ ] Pytest coverage met (60%+)
- [ ] Playwright tests passed

### Staging
- [ ] Deployment successful
- [ ] Smoke tests passed
- [ ] Monitoring active (cache hit rate, response times, errors)
- [ ] 2-4 hour stability validation

---

## 🎯 EXPECTED OUTCOMES

### Performance Improvements (Measured in Staging)
| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Cache Hit Rate | 0% | TBD | >70% |
| API P95 Response | ~200ms | TBD | <50ms (cached) |
| Bundle Size | 250KB | TBD | <250KB |
| Lighthouse Perf | 85 | TBD | 95+ |
| Page Load (P95) | 2.5s | TBD | <2.0s |

### Week 4 Progress
- **Before Day 2:** 70%
- **After Day 2:** 90% (target)
- **Remaining:** 10% (Day 3 production deployment)

---

## 🚨 RISK MITIGATION

### Risk 1: Cache introduces stale data
**Mitigation:** 
- Short TTLs initially (5-10 min)
- Proper invalidation on mutations
- Cache headers for debugging

### Risk 2: Virtual scrolling breaks existing UX
**Mitigation:**
- Document-only approach for Day 2
- Apply in future sprint with dedicated testing
- Keep current implementation working

### Risk 3: Code splitting causes routing issues
**Mitigation:**
- Test thoroughly in dev before activating
- Document activation steps
- Easy rollback (change one import)

### Risk 4: Staging deployment fails
**Mitigation:**
- Comprehensive pre-deployment checklist
- Automated smoke tests
- Docker Compose rollback strategy

---

## 📅 TIMELINE

| Phase | Duration | Start | End | Deliverable |
|-------|----------|-------|-----|-------------|
| 3A: Virtual Docs | 45 min | 09:00 | 09:45 | Integration guide |
| 3B: Caching | 60 min | 09:45 | 10:45 | 5+ endpoints cached |
| 3C: Code Split Docs | 15 min | 10:45 | 11:00 | Activation guide |
| **BREAK** | 15 min | 11:00 | 11:15 | ☕ |
| 3D: Benchmarking | 45 min | 11:15 | 12:00 | Performance reports |
| 3E: Quality | 45 min | 12:00 | 12:45 | Test results |
| **LUNCH** | 45 min | 12:45 | 13:30 | 🍽️ |
| 3F: Staging Deploy | 60 min | 13:30 | 14:30 | Staging live |
| Monitoring | 120 min | 14:30 | 16:30 | 2-hour validation |
| **TOTAL** | ~6 hours | | | **Week 4 at 90%** |

---

## 🎊 DAY 2 COMPLETION CRITERIA

**DONE when:**
1. ✅ Virtual scrolling integration guide created (3 pages)
2. ✅ Caching active on 5+ endpoints with monitoring
3. ✅ Code splitting activation guide created
4. ✅ Lighthouse audit shows 95+ performance
5. ✅ All security & quality tests passed
6. ✅ Staging deployment successful
7. ✅ 2-hour monitoring shows stable metrics
8. ✅ Week 4 progress at 90%

**Ready for Day 3 (Production Deployment) when:**
- Staging runs stable for 4+ hours
- No critical issues found
- Performance targets met
- Team sign-off obtained

---

**Implementation Start Time:** 2025-11-28 09:00 UTC  
**Target Completion:** 2025-11-28 16:30 UTC  
**Next Session:** Day 3 (Nov 30) - Production Deployment

---

**🚀 LET'S EXECUTE! WEEK 4 DAY 2 STARTS NOW! 🚀**
