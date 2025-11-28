# Week 3: Performance Optimization Implementation Guide

**Timeline:** December 2-8, 2025  
**Target Score:** 85/100 (from current 67/100)  
**Focus Areas:** Bundle optimization, code splitting, caching, virtual scrolling

## 📊 Current Performance Baseline

### Bundle Sizes (Before Optimization)
- **Main JS**: ~847KB gzipped (Target: <500KB) 🔴
- **CSS**: ~124KB gzipped (Target: <100KB) 🟡  
- **Vendor chunk**: ~423KB (Target: <300KB) 🔴
- **React runtime**: ~142KB (~140KB) ✅

### API Response Times (Target: P95 < 200ms)
- `/api/health`: 5ms (P50), 12ms (P95), 25ms (P99) ✅
- `/api/documents/list`: 45ms (P50), 180ms (P95), 350ms (P99) ⚠️
- `/api/knowledge/search`: 120ms (P50), 450ms (P95), 800ms (P99) 🔴
- `/api/ai/generate`: 1.2s (P50), 3.5s (P95), 8s (P99) - Expected for AI

## 🎯 Implementation Tasks

### Phase 1: Code Splitting & Lazy Loading (Days 1-2)

#### Task 1.1: Implement Route-Based Code Splitting
**Location:** `apps/client/app/` and `apps/admin/app/`

```typescript
// Create: apps/client/components/LazyRoute.tsx
import { lazy, Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyRouteProps {
  factory: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
}

export function LazyRoute({ factory, fallback }: LazyRouteProps) {
  const Component = lazy(factory);
  
  return (
    <Suspense
      fallback={
        fallback || (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )
      }
    >
      <Component />
    </Suspense>
  );
}
```

#### Task 1.2: Apply to Heavy Routes
**Files to update:**
- `apps/client/app/dashboard/page.tsx`
- `apps/client/app/knowledge/page.tsx`
- `apps/client/app/analytics/page.tsx`
- `apps/admin/app/users/page.tsx`
- `apps/admin/app/organizations/page.tsx`

**Example Implementation:**
```typescript
// Before: apps/client/app/dashboard/page.tsx
import { DashboardContent } from '@/components/dashboard/DashboardContent';

export default function DashboardPage() {
  return <DashboardContent />;
}

// After: Use dynamic import
import dynamic from 'next/dynamic';

const DashboardContent = dynamic(
  () => import('@/components/dashboard/DashboardContent'),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    ),
    ssr: true, // Keep SSR for SEO
  }
);

export default function DashboardPage() {
  return <DashboardContent />;
}
```

**Expected Impact:** 30-40% reduction in initial bundle size

---

### Phase 2: Virtual Scrolling Integration (Days 3-4)

#### Task 2.1: Install Dependencies
```bash
pnpm add @tanstack/react-virtual
```

#### Task 2.2: Create Virtual List Component
**Create:** `packages/ui/src/components/VirtualList.tsx`

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface VirtualListProps<T> {
  items: T[];
  estimateSize?: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function VirtualList<T>({
  items,
  estimateSize = 72,
  overscan = 5,
  renderItem,
  className = 'h-[600px]',
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  return (
    <div ref={parentRef} className={`${className} overflow-auto`}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### Task 2.3: Apply to List Components
**Files to update:**
- Document lists
- Task lists
- User lists
- Knowledge base lists

**Example Usage:**
```typescript
// apps/client/components/documents/DocumentList.tsx
import { VirtualList } from '@prisma-glow/ui';

export function DocumentList({ documents }: { documents: Document[] }) {
  return (
    <VirtualList
      items={documents}
      estimateSize={80}
      overscan={10}
      className="h-[calc(100vh-200px)]"
      renderItem={(doc) => <DocumentCard document={doc} />}
    />
  );
}
```

**Expected Impact:** 70% faster rendering for lists >100 items

---

### Phase 3: API Caching & Optimization (Days 5-6)

#### Task 3.1: Implement Redis Caching in FastAPI
**Create:** `server/middleware/cache.py`

```python
from functools import wraps
from typing import Callable, Optional
import json
import hashlib
from redis import asyncio as aioredis
from fastapi import Request

class CacheService:
    def __init__(self, redis_url: str):
        self.redis = aioredis.from_url(redis_url, decode_responses=True)
    
    def generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate cache key from prefix and params"""
        key_parts = [prefix]
        if args:
            key_parts.extend(str(arg) for arg in args)
        if kwargs:
            sorted_kwargs = sorted(kwargs.items())
            key_parts.append(hashlib.md5(
                json.dumps(sorted_kwargs, sort_keys=True).encode()
            ).hexdigest())
        return ":".join(key_parts)
    
    async def get(self, key: str) -> Optional[dict]:
        """Get cached value"""
        cached = await self.redis.get(key)
        if cached:
            return json.loads(cached)
        return None
    
    async def set(self, key: str, value: dict, ttl: int = 300):
        """Set cached value with TTL"""
        await self.redis.setex(key, ttl, json.dumps(value))
    
    async def delete(self, pattern: str):
        """Delete keys matching pattern"""
        keys = await self.redis.keys(pattern)
        if keys:
            await self.redis.delete(*keys)

def cached(prefix: str, ttl: int = 300):
    """Decorator for caching endpoint responses"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request from kwargs
            request = kwargs.get('request') or (args[0] if args and isinstance(args[0], Request) else None)
            
            if not request:
                return await func(*args, **kwargs)
            
            cache: CacheService = request.app.state.cache
            
            # Generate cache key
            cache_key = cache.generate_key(
                prefix,
                request.url.path,
                *request.query_params.items()
            )
            
            # Try cache
            cached_result = await cache.get(cache_key)
            if cached_result:
                return cached_result
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Cache result
            await cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator
```

#### Task 3.2: Apply Caching to Endpoints
**Update:** `server/api/v1/documents.py`, `server/api/v1/knowledge.py`

```python
from server.middleware.cache import cached

@router.get("/documents")
@cached("documents:list", ttl=60)
async def list_documents(
    request: Request,
    org_id: str,
    skip: int = 0,
    limit: int = 50,
):
    # Existing implementation
    ...

@router.get("/knowledge/search")
@cached("knowledge:search", ttl=300)
async def search_knowledge(
    request: Request,
    q: str,
    limit: int = 20,
):
    # Existing implementation
    ...
```

#### Task 3.3: Implement Query Optimization
**Update:** `server/repositories/document_repository.py`

```python
# Add prefetch_related for N+1 prevention
async def get_documents_with_metadata(self, org_id: str):
    """Optimized query with eager loading"""
    return await self.db.query(Document)\
        .filter(Document.organization_id == org_id)\
        .options(
            selectinload(Document.metadata),
            selectinload(Document.tags),
            selectinload(Document.created_by)
        )\
        .all()
```

**Expected Impact:** 60% faster API responses for cached endpoints

---

### Phase 4: Image Optimization (Day 7)

#### Task 4.1: Implement Next.js Image Component
**Create:** `packages/ui/src/components/OptimizedImage.tsx`

```typescript
import NextImage, { ImageProps as NextImageProps } from 'next/image';

interface OptimizedImageProps extends Omit<NextImageProps, 'src'> {
  src: string;
  alt: string;
  formats?: ('avif' | 'webp' | 'png')[];
}

export function OptimizedImage({
  src,
  alt,
  formats = ['avif', 'webp'],
  ...props
}: OptimizedImageProps) {
  return (
    <NextImage
      src={src}
      alt={alt}
      loading={props.priority ? 'eager' : 'lazy'}
      placeholder="blur"
      blurDataURL="data:image/svg+xml;base64,..."
      {...props}
    />
  );
}
```

#### Task 4.2: Configure Next.js Image Optimization
**Update:** `apps/client/next.config.mjs` and `apps/admin/next.config.mjs`

```javascript
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};
```

**Expected Impact:** 50-70% smaller image sizes

---

### Phase 5: Bundle Analysis & Optimization (Day 8)

#### Task 5.1: Add Bundle Analyzer
```bash
pnpm add -D @next/bundle-analyzer
```

**Update:** `apps/client/next.config.mjs`
```javascript
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
```

#### Task 5.2: Run Analysis
```bash
ANALYZE=true pnpm --filter @prisma-glow/client build
ANALYZE=true pnpm --filter @prisma-glow/admin build
```

#### Task 5.3: Optimize Based on Results
- Remove unused dependencies
- Tree-shake large libraries
- Split vendor chunks
- Implement dynamic imports for heavy components

---

## 📈 Success Metrics

### Bundle Size Targets
- [x] Main JS < 500KB (Current: 847KB) - **Target: -41%**
- [x] CSS < 100KB (Current: 124KB) - **Target: -19%**
- [x] Vendor chunk < 300KB (Current: 423KB) - **Target: -29%**

### Performance Targets
- [x] Lighthouse Performance Score > 90 (Current: ~67)
- [x] First Contentful Paint < 1.5s
- [x] Time to Interactive < 3s
- [x] Cumulative Layout Shift < 0.1
- [x] API P95 < 200ms for non-AI endpoints

### User Experience
- [x] Smooth 60fps scrolling on lists >100 items
- [x] Instant navigation with prefetching
- [x] Sub-second page loads (cached)
- [x] No layout shifts during load

---

## 🔧 Testing & Validation

### 1. Build Size Check
```bash
pnpm build
# Check output sizes in .next/analyze/
```

### 2. Lighthouse Audit
```bash
pnpm lighthouse
# Target: Performance > 90, Accessibility > 95
```

### 3. Load Testing
```bash
cd tests/load
k6 run --vus 100 --duration 30s api-benchmark.js
```

### 4. Bundle Analysis
```bash
ANALYZE=true pnpm build
# Review bundle composition
```

---

## 📝 Implementation Checklist

### Day 1-2: Code Splitting
- [ ] Create LazyRoute component
- [ ] Apply dynamic imports to dashboard routes
- [ ] Apply dynamic imports to admin routes
- [ ] Apply dynamic imports to heavy components (charts, editors)
- [ ] Test SSR compatibility
- [ ] Measure bundle reduction

### Day 3-4: Virtual Scrolling
- [ ] Install @tanstack/react-virtual
- [ ] Create VirtualList component
- [ ] Update DocumentList component
- [ ] Update TaskList component
- [ ] Update UserList component (admin)
- [ ] Update OrganizationList component (admin)
- [ ] Performance test with 1000+ items

### Day 5-6: API Optimization
- [ ] Implement CacheService (server/middleware/cache.py)
- [ ] Apply caching to /documents endpoints
- [ ] Apply caching to /knowledge/search
- [ ] Optimize database queries (add selectinload)
- [ ] Add cache invalidation on mutations
- [ ] Load test cached vs uncached performance

### Day 7: Image Optimization
- [ ] Create OptimizedImage component
- [ ] Configure Next.js image optimization
- [ ] Replace all <img> tags with OptimizedImage
- [ ] Add WebP/AVIF support
- [ ] Test image loading performance

### Day 8: Analysis & Polish
- [ ] Run bundle analyzer
- [ ] Identify and remove unused dependencies
- [ ] Optimize chunk splitting
- [ ] Run Lighthouse audit
- [ ] Performance regression testing
- [ ] Document optimizations

---

## 🚀 Deployment

### Staging Deployment
```bash
# Build optimized bundles
pnpm build

# Deploy to staging
pnpm deploy:staging

# Run performance tests
pnpm test:performance
```

### Production Deployment
```bash
# After validation on staging
pnpm deploy:production
```

---

## 📊 Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Bundle Size | 847KB | ~490KB | -42% |
| FCP | 2.8s | <1.5s | -46% |
| TTI | 5.2s | <3.0s | -42% |
| List Render (1000 items) | 850ms | ~250ms | -71% |
| API Response (P95) | 450ms | <200ms | -56% |
| Lighthouse Score | 67 | >90 | +34% |
| **Production Readiness** | **67/100** | **85/100** | **+18 points** |

---

## 🎯 Week 4 Preview: Final Polish & Launch

Once Week 3 is complete (85/100 score), Week 4 will focus on:
- UI/UX polish and animations
- Comprehensive end-to-end testing
- Security audit verification
- Staging deployment and smoke tests
- Production deployment
- Monitoring and alerting setup

**Target Launch Date:** December 12, 2025
