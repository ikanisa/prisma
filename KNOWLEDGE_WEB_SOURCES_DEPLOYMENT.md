# Knowledge Web Sources - Deployment Checklist

**Last Updated**: 2025-12-01  
**Status**: Ready for deployment

---

## ✅ Pre-Deployment Checklist

### Files Created & Verified

- [x] Migration file: `supabase/migrations/20251201_knowledge_web_sources_200_urls.sql` (33KB)
- [x] TypeScript helpers: `packages/lib/src/knowledge-web-sources.ts` (13KB)
- [x] Package config: `packages/lib/package.json`
- [x] Package index: `packages/lib/src/index.ts`
- [x] TypeScript config: `packages/lib/tsconfig.json`
- [x] Admin panel: `apps/web/app/admin/knowledge/sources/page.tsx` (15KB)
- [x] Knowledge hub update: `apps/web/app/admin/knowledge/page.tsx`
- [x] Integration example: `apps/web/components/deep-search-integration.tsx` (6.5KB)
- [x] Main README: `KNOWLEDGE_WEB_SOURCES.md` (13KB)
- [x] Complete guide: `KNOWLEDGE_WEB_SOURCES_COMPLETE.md` (12KB)
- [x] Quick reference: `README_KNOWLEDGE_WEB_SOURCES.md` (8KB)
- [x] Integration guide: `docs/KNOWLEDGE_WEB_SOURCES_GUIDE.md` (12KB)
- [x] Migration instructions: `APPLY_MIGRATION_INSTRUCTIONS.md` (4KB)
- [x] Verification script: `scripts/verify-knowledge-sources.sh` (5KB)
- [x] Main README updated: `README.md`

**Total**: 15 files created, ~96KB of code + documentation

---

## 🚀 Deployment Steps

### Step 1: Apply Database Migration (5 minutes)

**Status**: ⚠️ **NOT YET APPLIED**

**Option A: Supabase Studio (Recommended)**

1. Go to: https://supabase.com/dashboard/project/rcocfusrqrornukrnkln/sql
2. Open file: `supabase/migrations/20251201_knowledge_web_sources_200_urls.sql`
3. Copy entire contents (Cmd+A, Cmd+C)
4. Paste into SQL Editor
5. Click "Run" button
6. Wait for success message

**Verification**:
```sql
SELECT COUNT(*) FROM knowledge_web_sources;
-- Should return: 200

SELECT category, COUNT(*) 
FROM knowledge_web_sources 
GROUP BY category 
ORDER BY COUNT(*) DESC;
-- Should show distribution across categories

SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'knowledge_web_sources';
-- Should show 6 indexes
```

**Option B: Direct psql**

```bash
# Export connection string from Supabase Studio → Project Settings → Database
export DATABASE_URL='postgresql://...'

# Apply migration
psql "$DATABASE_URL" -f supabase/migrations/20251201_knowledge_web_sources_200_urls.sql

# Verify
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM knowledge_web_sources;"
```

**Expected Result**:
- ✅ Table `knowledge_web_sources` created
- ✅ 200 rows inserted
- ✅ 6 indexes created
- ✅ Constraints applied

---

### Step 2: Install TypeScript Package Dependencies (2 minutes)

**Status**: ⚠️ **NOT YET DONE**

```bash
cd /Users/jeanbosco/workspace/prisma

# Install dependencies for @prisma-glow/lib package
pnpm install --frozen-lockfile

# Verify package is available
pnpm --filter @prisma-glow/lib run typecheck

# Build the package (if needed)
pnpm --filter @prisma-glow/lib build
```

**Verification**:
```bash
# Should complete without errors
node -e "console.log(require('./packages/lib/package.json').name)"
# Output: @prisma-glow/lib
```

---

### Step 3: Verify Admin Panel Access (2 minutes)

**Status**: ⚠️ **NOT YET TESTED**

**Development Mode**:
```bash
# Start Next.js dev server
pnpm --filter web dev

# Open browser
# Navigate to: http://localhost:3000/admin/knowledge/sources
```

**Production Mode**:
```bash
# Build Next.js app
pnpm --filter web build

# Start production server
pnpm --filter web start

# Navigate to: http://localhost:3000/admin/knowledge/sources
```

**Expected Behavior**:
- ✅ Page loads without errors
- ✅ Stats dashboard shows: Total 200, Active 200, etc.
- ✅ Source list displays all 200 sources
- ✅ Filters work (search, category, jurisdiction, status)
- ✅ Toggle status button works
- ✅ Category distribution chart shows

**Troubleshooting**:
- If "No sources found": Migration wasn't applied
- If 404 error: Ensure route file exists at correct path
- If TypeScript errors: Run `pnpm install` again
- If Supabase connection fails: Check env vars

---

### Step 4: Test TypeScript API (5 minutes)

**Status**: ⚠️ **NOT YET TESTED**

Create a test file: `test-knowledge-sources.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { 
  getActiveDomains, 
  getPrimarySources,
  getCrawlStats,
  getSourceCountByCategory 
} from '@prisma-glow/lib';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    // Test 1: Get active domains
    console.log('\n🧪 Test 1: Get active domains');
    const domains = await getActiveDomains(supabase);
    console.log(`✅ Found ${domains.length} domains`);
    console.log('First 5:', domains.slice(0, 5));

    // Test 2: Get primary IFRS sources
    console.log('\n🧪 Test 2: Get primary IFRS sources');
    const ifrs = await getPrimarySources(supabase, { category: 'IFRS' });
    console.log(`✅ Found ${ifrs.length} primary IFRS sources`);

    // Test 3: Get crawl stats
    console.log('\n🧪 Test 3: Get crawl statistics');
    const stats = await getCrawlStats(supabase);
    console.log('✅ Stats:', stats);

    // Test 4: Get category counts
    console.log('\n🧪 Test 4: Get category distribution');
    const counts = await getSourceCountByCategory(supabase);
    console.log('✅ Categories:', counts);

    console.log('\n🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

test();
```

Run the test:
```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL='https://your-project.supabase.co'
export NEXT_PUBLIC_SUPABASE_ANON_KEY='your-anon-key'

# Run test
npx tsx test-knowledge-sources.ts
```

**Expected Output**:
```
🧪 Test 1: Get active domains
✅ Found 80-90 domains
First 5: ['ifrs.org', 'iaasb.org', 'ethicsboard.org', ...]

🧪 Test 2: Get primary IFRS sources
✅ Found 20-30 primary IFRS sources

🧪 Test 3: Get crawl statistics
✅ Stats: { total: 200, active: 200, neverCrawled: 200, ... }

🧪 Test 4: Get category distribution
✅ Categories: { IFRS: 30, TAX: 60, ISA: 14, ... }

🎉 All tests passed!
```

---

### Step 5: Integration Testing (10 minutes)

**Status**: ⚠️ **NOT YET DONE**

#### A. DeepSearch Integration Test

Create file: `test-deepsearch-integration.tsx`

```typescript
import { getActiveDomains, getPrimarySources } from '@prisma-glow/lib';

// Test in a React component
export function TestDeepSearch() {
  const [domains, setDomains] = useState<string[]>([]);
  
  useEffect(() => {
    async function load() {
      const activeDomains = await getActiveDomains(supabase);
      setDomains(activeDomains);
      console.log('DeepSearch whitelist:', activeDomains);
    }
    load();
  }, []);
  
  return <div>Loaded {domains.length} trusted domains</div>;
}
```

#### B. Crawler Integration Test

```typescript
import { getSourcesNeedingCrawl, markSourceCrawled } from '@prisma-glow/lib';

async function testCrawler() {
  // Get sources needing crawl (never crawled)
  const batch = await getSourcesNeedingCrawl(supabase, 365, 10);
  
  console.log(`Found ${batch.length} sources to crawl`);
  
  for (const source of batch) {
    console.log(`Crawling: ${source.name}`);
    
    // Simulate crawl
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mark as crawled
    await markSourceCrawled(supabase, source.id);
    console.log(`✓ Marked as crawled`);
  }
}
```

#### C. Admin Panel CRUD Test

Test via UI:
1. Navigate to `/admin/knowledge/sources`
2. Search for "IFRS"
3. Filter by category "TAX"
4. Filter by jurisdiction "RW"
5. Toggle a source to INACTIVE
6. Toggle back to ACTIVE
7. Verify category distribution chart

---

## 📊 Post-Deployment Verification

### Database Verification

Run these queries in Supabase SQL Editor:

```sql
-- 1. Check row count
SELECT COUNT(*) as total_sources FROM knowledge_web_sources;
-- Expected: 200

-- 2. Check status distribution
SELECT status, COUNT(*) 
FROM knowledge_web_sources 
GROUP BY status;
-- Expected: ACTIVE: 200

-- 3. Check category distribution
SELECT category, COUNT(*) as count
FROM knowledge_web_sources 
GROUP BY category 
ORDER BY count DESC;
-- Expected: TAX: ~60, IFRS: ~30, etc.

-- 4. Check jurisdiction distribution
SELECT jurisdiction_code, COUNT(*) as count
FROM knowledge_web_sources 
GROUP BY jurisdiction_code 
ORDER BY count DESC;
-- Expected: GLOBAL: 140, MT: 19, RW: 15, etc.

-- 5. Check authority levels
SELECT authority_level, COUNT(*) 
FROM knowledge_web_sources 
GROUP BY authority_level;
-- Expected: PRIMARY: ~70-80, SECONDARY: ~120-130

-- 6. Check never crawled
SELECT COUNT(*) 
FROM knowledge_web_sources 
WHERE last_crawled_at IS NULL;
-- Expected: 200 (initially)

-- 7. Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'knowledge_web_sources';
-- Expected: 6 indexes

-- 8. Sample data
SELECT name, url, category, jurisdiction_code, authority_level
FROM knowledge_web_sources 
LIMIT 10;
-- Should show realistic data
```

### Admin Panel Verification

- [ ] Page loads at `/admin/knowledge/sources`
- [ ] Stats show correct counts
- [ ] Search works
- [ ] Category filter works
- [ ] Jurisdiction filter works
- [ ] Status filter works (All/Active/Inactive)
- [ ] Toggle status button works
- [ ] Category distribution chart displays
- [ ] Source list shows all details (name, URL, badges, etc.)
- [ ] Pagination works (if implemented)

### API Verification

- [ ] `getActiveSources()` returns 200 sources
- [ ] `getActiveDomains()` returns ~80-90 domains
- [ ] `getPrimarySources()` returns ~70-80 sources
- [ ] `getSourcesByCategory('IFRS')` returns ~30 sources
- [ ] `getSourcesByJurisdiction('MT')` returns 19 sources
- [ ] `getCrawlStats()` returns correct stats
- [ ] `getSourceCountByCategory()` returns correct counts
- [ ] `toggleSourceStatus()` toggles status
- [ ] `markSourceCrawled()` updates timestamp

---

## 🎯 Success Criteria

All items must be ✅ before marking as deployed:

### Database
- [ ] Migration applied successfully
- [ ] 200 rows in `knowledge_web_sources` table
- [ ] 6 indexes created
- [ ] Constraints working (status, authority_level)
- [ ] Sample queries return expected data

### TypeScript Package
- [ ] `@prisma-glow/lib` package builds without errors
- [ ] All helper functions work correctly
- [ ] Types are exported and available
- [ ] JSDoc documentation displays in IDE

### Admin Panel
- [ ] Page accessible at `/admin/knowledge/sources`
- [ ] All UI components render correctly
- [ ] Filters and search work
- [ ] Toggle status works
- [ ] Stats dashboard accurate
- [ ] No console errors

### Documentation
- [ ] README updated with knowledge sources section
- [ ] All documentation files created
- [ ] Quick start guide is accurate
- [ ] Integration examples work

### Integration
- [ ] Can import helpers in external code
- [ ] DeepSearch can use domains
- [ ] Crawler can use scheduling
- [ ] No TypeScript errors in consuming code

---

## 🐛 Known Issues & Resolutions

### Issue 1: Migration Not Applied

**Symptom**: `SELECT COUNT(*) FROM knowledge_web_sources;` returns error  
**Cause**: Migration hasn't been run yet  
**Resolution**: Follow Step 1 above  

### Issue 2: TypeScript Import Errors

**Symptom**: `Cannot find module '@prisma-glow/lib'`  
**Cause**: Package not installed or not built  
**Resolution**: Run `pnpm install --frozen-lockfile`

### Issue 3: Admin Panel 404

**Symptom**: Page not found at `/admin/knowledge/sources`  
**Cause**: Next.js app not rebuilt after adding page  
**Resolution**: 
```bash
pnpm --filter web build
pnpm --filter web dev
```

### Issue 4: No Sources Showing

**Symptom**: Admin panel shows "No sources found"  
**Cause**: Migration not applied or all sources INACTIVE  
**Resolution**: Check migration and run verification queries

### Issue 5: Supabase Connection Errors

**Symptom**: "Failed to fetch" errors in console  
**Cause**: Missing or incorrect env vars  
**Resolution**: Verify `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 📋 Rollback Plan

If deployment fails and needs to be rolled back:

### Rollback Step 1: Drop Table

```sql
-- CAUTION: This will delete all data
DROP TABLE IF EXISTS knowledge_web_sources CASCADE;
```

### Rollback Step 2: Remove Package

```bash
# Remove from dependencies
# Edit package.json and remove @prisma-glow/lib references

# Clean node_modules
rm -rf node_modules packages/lib/node_modules
pnpm install
```

### Rollback Step 3: Remove Admin Panel Routes

```bash
# Remove the sources page
rm -rf apps/web/app/admin/knowledge/sources/

# Revert knowledge hub changes
git checkout apps/web/app/admin/knowledge/page.tsx
```

### Rollback Step 4: Revert README

```bash
git checkout README.md
```

---

## ✅ Deployment Sign-Off

**Deployment Date**: _____________

**Deployed By**: _____________

**Migration Applied**: [ ] Yes [ ] No

**Tests Passed**: [ ] Yes [ ] No

**Admin Panel Working**: [ ] Yes [ ] No

**API Verified**: [ ] Yes [ ] No

**Documentation Complete**: [ ] Yes [ ] No

**Stakeholders Notified**: [ ] Yes [ ] No

**Production Ready**: [ ] Yes [ ] No

---

**Notes**:

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

---

## 🎉 Next Steps After Deployment

1. **Monitor Usage**
   - Check admin panel analytics
   - Track API usage
   - Monitor crawl statistics

2. **Configure Crawler**
   - Set up scheduled job to crawl sources
   - Prioritize primary sources
   - Update last_crawled_at timestamps

3. **Integrate with DeepSearch**
   - Use `getActiveDomains()` for whitelisting
   - Filter by category for specialized searches
   - Prioritize primary sources in results

4. **Optimize Performance**
   - Monitor query performance
   - Add additional indexes if needed
   - Consider caching frequently accessed data

5. **Add Features**
   - Implement source editing UI
   - Add bulk import/export
   - Create source validation
   - Add crawl failure tracking

---

**Status**: Ready for deployment ✅  
**Next Action**: Apply migration via Supabase Studio  
**Estimated Time**: 20 minutes total
