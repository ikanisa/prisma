# Week 3: Performance Optimization Implementation

**Date Started:** 2025-11-28  
**Status:** 🚀 **IN PROGRESS**  
**Timeline:** November 28 - December 4, 2025

---

## 🎯 OBJECTIVES

Transform Prisma Glow from functional to high-performance with enterprise-grade optimization:
- **Page Load Time:** <2s (currently ~4s) - 50% reduction
- **Time to Interactive:** <3s (currently ~6s) - 50% reduction
- **First Contentful Paint:** <1s - 70% improvement
- **Lighthouse Score:** 95+ (currently ~80) - +15 points
- **API Response Time:** P95 <200ms - 40% faster

---

## ✅ Week 3 Tasks (5 Major Areas)

### 1. Code Splitting & Lazy Loading
**Priority:** HIGH  
**Impact:** Bundle size reduction 40-60%

### 2. Virtual Scrolling for Large Lists
**Priority:** HIGH  
**Impact:** Render performance 10x improvement

### 3. Database Query Optimization
**Priority:** CRITICAL  
**Impact:** API latency reduction 50-70%

### 4. Redis Caching Strategy
**Priority:** HIGH  
**Impact:** Cache hit rate 80%+, response time 90% faster

### 5. Bundle Size Monitoring & Optimization
**Priority:** MEDIUM  
**Impact:** Initial load 30% faster

---

## 🚀 TASK 1: CODE SPLITTING & LAZY LOADING

### Implementation Plan

#### Step 1: Analyze Current Bundle
```bash
# Install bundle analyzer
pnpm add -D @next/bundle-analyzer webpack-bundle-analyzer

# Analyze build
ANALYZE=true pnpm run build
```

#### Step 2: Implement Route-Based Code Splitting
**File:** `src/App.tsx` or Next.js pages

**Pattern:**
```typescript
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading';

// Lazy load route components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Reporting = lazy(() => import('./pages/reporting/report'));
const AIAgent = lazy(() => import('./pages/AIAgent'));
const Documents = lazy(() => import('./pages/documents/DocumentList'));
const Tasks = lazy(() => import('./pages/tasks/TaskBoard'));
const Settings = lazy(() => import('./pages/settings/Settings'));

// Route configuration with Suspense boundaries
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/analytics" element={<Analytics />} />
    <Route path="/reporting/:id" element={<Reporting />} />
    <Route path="/agent" element={<AIAgent />} />
    <Route path="/documents" element={<Documents />} />
    <Route path="/tasks" element={<Tasks />} />
    <Route path="/settings" element={<Settings />} />
  </Routes>
</Suspense>
```

#### Step 3: Component-Level Code Splitting
**Heavy components to lazy load:**
- Chart libraries (recharts, victory)
- Rich text editors
- PDF viewers
- AI chat interface

**Pattern:**
```typescript
const ChartComponent = lazy(() => import('@/components/charts/BarChart'));
const PDFViewer = lazy(() => import('@/components/documents/PDFViewer'));
const RichTextEditor = lazy(() => import('@/components/editors/RichTextEditor'));

// Usage with error boundaries
<ErrorBoundary fallback={<ChartError />}>
  <Suspense fallback={<Skeleton className="h-64" />}>
    <ChartComponent data={data} />
  </Suspense>
</ErrorBoundary>
```

#### Step 4: Dynamic Imports for Conditional Features
```typescript
// Only load if user has permission
const AdminPanel = async () => {
  if (hasAdminRole) {
    const { AdminPanel } = await import('@/components/admin/AdminPanel');
    return <AdminPanel />;
  }
  return null;
};

// Only load if feature is enabled
const AIFeatures = user.hasFeature('ai') 
  ? lazy(() => import('@/features/ai/AIFeatures'))
  : null;
```

---

## 🚀 TASK 2: VIRTUAL SCROLLING

### Implementation Plan

#### Step 1: Install TanStack Virtual
```bash
pnpm add @tanstack/react-virtual
```

#### Step 2: Implement Virtual Lists
**File:** `src/components/documents/VirtualDocumentList.tsx`

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function VirtualDocumentList({ documents }: { documents: Document[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: documents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Estimated row height
    overscan: 5, // Number of items to render outside viewport
  });

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const document = documents[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <DocumentRow document={document} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

#### Step 3: Virtual Tables
**File:** `src/components/tasks/VirtualTaskTable.tsx`

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function VirtualTaskTable({ tasks }: { tasks: Task[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="h-[calc(100vh-200px)] overflow-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-background z-10">
          <tr>
            <th>Title</th>
            <th>Assignee</th>
            <th>Status</th>
            <th>Due Date</th>
          </tr>
        </thead>
        <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const task = tasks[virtualRow.index];
            return (
              <tr
                key={task.id}
                style={{
                  position: 'absolute',
                  transform: `translateY(${virtualRow.start}px)`,
                  width: '100%',
                }}
              >
                <td>{task.title}</td>
                <td>{task.assignee}</td>
                <td>{task.status}</td>
                <td>{task.dueDate}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

#### Step 4: Virtual Grid for Cards
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualCardGrid({ items }: { items: any[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const COLUMN_COUNT = 3;
  const CARD_HEIGHT = 200;
  
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(items.length / COLUMN_COUNT),
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT,
    overscan: 2,
  });

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * COLUMN_COUNT;
          const rowItems = items.slice(startIndex, startIndex + COLUMN_COUNT);
          
          return (
            <div
              key={virtualRow.key}
              className="grid grid-cols-3 gap-4"
              style={{
                position: 'absolute',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {rowItems.map(item => (
                <Card key={item.id} data={item} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 🚀 TASK 3: DATABASE QUERY OPTIMIZATION

### Implementation Plan

#### Step 1: Identify N+1 Queries
**Analysis Tool:** Add query logging

**File:** `server/db.py`
```python
import logging
from sqlalchemy import event
from sqlalchemy.engine import Engine

# Log slow queries
@event.listens_for(Engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    conn.info.setdefault('query_start_time', []).append(time.time())
    
@event.listens_for(Engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    total = time.time() - conn.info['query_start_time'].pop()
    if total > 0.1:  # Log queries slower than 100ms
        logging.warning(f"Slow query ({total:.2f}s): {statement[:200]}")
```

#### Step 2: Optimize Common Queries

**Before (N+1 Problem):**
```python
# BAD: N+1 query
async def get_documents_with_metadata(org_id: str):
    documents = await db.query(Document).filter_by(org_id=org_id).all()
    for doc in documents:
        doc.metadata = await db.query(Metadata).filter_by(doc_id=doc.id).first()
        doc.tags = await db.query(Tag).filter_by(doc_id=doc.id).all()
    return documents
```

**After (Eager Loading):**
```python
# GOOD: Single query with joins
async def get_documents_with_metadata(org_id: str):
    return await db.query(Document)\
        .filter_by(org_id=org_id)\
        .options(
            joinedload(Document.metadata),
            selectinload(Document.tags)
        )\
        .all()
```

#### Step 3: Add Database Indexes

**File:** `supabase/migrations/20251128100000_performance_indexes.sql`

```sql
-- Add missing indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_org_created
  ON documents(organization_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_status
  ON documents(status)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assignee_status
  ON tasks(assignee_id, status, due_date)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_events_entity
  ON activity_events(entity_type, entity_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_responses_engagement
  ON audit_responses(engagement_id, control_id);

-- Composite index for common filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_org_type_status
  ON documents(organization_id, document_type, status)
  WHERE deleted_at IS NULL;

-- Partial index for active records only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_active
  ON tasks(organization_id, status)
  WHERE deleted_at IS NULL AND status != 'COMPLETED';
```

#### Step 4: Query Result Pagination

```python
from fastapi import Query

@router.get("/documents")
async def list_documents(
    org_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    order_by: str = "created_at",
    order: str = "desc"
):
    offset = (page - 1) * page_size
    
    query = db.query(Document)\
        .filter_by(organization_id=org_id)\
        .order_by(text(f"{order_by} {order}"))
    
    total = await query.count()
    documents = await query.offset(offset).limit(page_size).all()
    
    return {
        "items": documents,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size
    }
```

---

## 🚀 TASK 4: REDIS CACHING STRATEGY

### Implementation Plan

#### Step 1: Redis Cache Layer

**File:** `server/cache.py`

```python
from redis import asyncio as aioredis
import json
import hashlib
from typing import Optional, Any, Callable
from functools import wraps

class CacheService:
    def __init__(self, redis_url: str):
        self.redis = aioredis.from_url(redis_url, encoding="utf-8", decode_responses=True)
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        value = await self.redis.get(key)
        if value:
            return json.loads(value)
        return None
    
    async def set(self, key: str, value: Any, ttl: int = 300):
        """Set value in cache with TTL"""
        await self.redis.setex(key, ttl, json.dumps(value, default=str))
    
    async def delete(self, key: str):
        """Delete key from cache"""
        await self.redis.delete(key)
    
    async def get_or_set(
        self, 
        key: str, 
        factory: Callable, 
        ttl: int = 300
    ) -> Any:
        """Get from cache or compute and store"""
        cached = await self.get(key)
        if cached is not None:
            return cached
        
        result = await factory()
        await self.set(key, result, ttl)
        return result
    
    def cache_key(self, *args, **kwargs) -> str:
        """Generate cache key from arguments"""
        key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True)
        return hashlib.sha256(key_data.encode()).hexdigest()

# Decorator for caching function results
def cached(ttl: int = 300, key_prefix: str = ""):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache = kwargs.get('cache')
            if not cache:
                return await func(*args, **kwargs)
            
            # Generate cache key
            cache_key = f"{key_prefix}:{cache.cache_key(*args, **kwargs)}"
            
            # Try to get from cache
            result = await cache.get(cache_key)
            if result is not None:
                return result
            
            # Compute and cache
            result = await func(*args, **kwargs)
            await cache.set(cache_key, result, ttl)
            return result
        
        return wrapper
    return decorator
```

#### Step 2: Implement Caching in API Routes

**File:** `server/api/v1/documents.py`

```python
from server.cache import CacheService, cached

cache = CacheService(os.getenv("REDIS_URL"))

@router.get("/documents/{doc_id}")
@cached(ttl=60, key_prefix="document")
async def get_document(doc_id: str, cache: CacheService = Depends(lambda: cache)):
    document = await db.query(Document).filter_by(id=doc_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document

@router.get("/search")
async def search_documents(
    q: str,
    org_id: str,
    cache: CacheService = Depends(lambda: cache)
):
    cache_key = f"search:{org_id}:{hashlib.md5(q.encode()).hexdigest()}"
    
    return await cache.get_or_set(
        cache_key,
        lambda: perform_search(q, org_id),
        ttl=300
    )
```

#### Step 3: Cache Invalidation Strategy

```python
class CacheInvalidation:
    def __init__(self, cache: CacheService):
        self.cache = cache
    
    async def invalidate_document(self, doc_id: str):
        """Invalidate all caches related to a document"""
        patterns = [
            f"document:*{doc_id}*",
            f"documents:org:*",
            f"search:*"
        ]
        for pattern in patterns:
            keys = await self.cache.redis.keys(pattern)
            if keys:
                await self.cache.redis.delete(*keys)
    
    async def invalidate_organization(self, org_id: str):
        """Invalidate all caches for an organization"""
        pattern = f"*:org:{org_id}:*"
        keys = await self.cache.redis.keys(pattern)
        if keys:
            await self.cache.redis.delete(*keys)

# Use in update endpoints
@router.put("/documents/{doc_id}")
async def update_document(
    doc_id: str,
    update: DocumentUpdate,
    cache_invalidation: CacheInvalidation = Depends()
):
    document = await db.update_document(doc_id, update)
    await cache_invalidation.invalidate_document(doc_id)
    return document
```

---

## 🚀 TASK 5: BUNDLE SIZE MONITORING

### Implementation Plan

#### Step 1: Bundle Analyzer Configuration

**File:** `next.config.js` or `vite.config.ts`

```typescript
// For Next.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... existing config
});

// For Vite
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

#### Step 2: Bundle Size Budgets

**File:** `.github/workflows/ci.yml`

```yaml
- name: Check bundle size
  run: |
    pnpm run build
    npm install -g bundlesize
    bundlesize

# bundlesize.config.json
{
  "files": [
    {
      "path": "dist/**/*.js",
      "maxSize": "500 KB"
    },
    {
      "path": "dist/**/*.css",
      "maxSize": "100 KB"
    }
  ]
}
```

#### Step 3: Tree Shaking Optimization

```typescript
// Import only what you need
import { Button } from '@/components/ui/button';  // ✅ Good
// import * as UI from '@/components/ui';  // ❌ Bad

// For lodash
import debounce from 'lodash/debounce';  // ✅ Good
// import _ from 'lodash';  // ❌ Bad (includes everything)

// For date libraries
import { format } from 'date-fns';  // ✅ Good
// import moment from 'moment';  // ❌ Bad (large bundle)
```

---

## 📊 Week 3 Progress Tracker

| Task | Status | Completion | ETA |
|------|--------|-----------|-----|
| Code Splitting | 🚧 IN PROGRESS | 0% | Nov 29 |
| Virtual Scrolling | ❌ TODO | 0% | Nov 30 |
| Query Optimization | ❌ TODO | 0% | Dec 1 |
| Redis Caching | ❌ TODO | 0% | Dec 2 |
| Bundle Monitoring | ❌ TODO | 0% | Dec 3 |

**Overall Week 3 Progress:** 0% (0/5 tasks)

---

## 🎯 Expected Impact

**After Week 3 Completion:**
- **Performance Score:** 90/100 (+10 from current 80/100)
- **Page Load Time:** <2s (50% reduction from 4s)
- **Time to Interactive:** <3s (50% reduction from 6s)
- **API Latency (P95):** <200ms (40% improvement)
- **Bundle Size:** -40% reduction
- **Lighthouse Score:** 95+ (+15 points)

---

**Next Update:** 2025-11-29  
**Coordinator:** Performance Engineering Team  
**Status:** ✅ Ready to Begin
