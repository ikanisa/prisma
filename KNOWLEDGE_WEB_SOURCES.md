# 🌐 Knowledge Web Sources System

**Production-ready management system for 200 curated web sources powering AI agent learning**

---

## 🚀 Quick Start (3 Steps)

### 1. Apply Migration (5 minutes)

Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/rcocfusrqrornukrnkln/sql):

```sql
-- Copy and paste contents of:
-- supabase/migrations/20251201_knowledge_web_sources_200_urls.sql
```

Verify:
```sql
SELECT COUNT(*) FROM knowledge_web_sources;
-- Should return: 200
```

### 2. Access Admin Panel

Navigate to: **`/admin/knowledge/sources`**

You'll see:
- 📊 Real-time stats dashboard
- 🔍 Advanced search & filtering
- ✏️ Edit/Toggle/Delete sources
- 📈 Category distribution visualization

### 3. Use in Your Code

```typescript
import { getActiveDomains, getPrimarySources } from '@prisma/lib';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

// Get all active domains for DeepSearch whitelist
const domains = await getActiveDomains(supabase);
console.log(`Loaded ${domains.length} trusted domains`);

// Get primary IFRS sources
const ifrsSources = await getPrimarySources(supabase, { 
  category: 'IFRS' 
});

// Get Rwanda tax sources
const rwTax = await getActiveSources(supabase, {
  category: 'TAX',
  jurisdiction: 'RW'
});
```

---

## 📦 What's Included

### Database
- ✅ `knowledge_web_sources` table with 200 URLs
- ✅ 6 performance indexes
- ✅ Constraints for data integrity
- ✅ Crawl timestamp tracking

### TypeScript Library (`@prisma/lib`)
- ✅ 10 query helpers
- ✅ 6 mutation helpers  
- ✅ 3 analytics helpers
- ✅ Full type safety + JSDoc

### Admin UI
- ✅ `/admin/knowledge/sources` - Full management interface
- ✅ Real-time filtering & search
- ✅ Toggle ACTIVE/INACTIVE status
- ✅ Category & jurisdiction filters
- ✅ Crawl statistics dashboard

### Documentation
- ✅ `KNOWLEDGE_WEB_SOURCES_COMPLETE.md` - Complete guide
- ✅ `README_KNOWLEDGE_WEB_SOURCES.md` - Quick reference
- ✅ `docs/KNOWLEDGE_WEB_SOURCES_GUIDE.md` - Integration guide
- ✅ `APPLY_MIGRATION_INSTRUCTIONS.md` - Setup help

---

## 🗂️ Data Summary

| Metric | Count | Details |
|--------|-------|---------|
| **Total URLs** | 200 | Across 12 categories |
| **Domains** | ~80-90 | IFRS, Big4, Tax authorities, Professional bodies |
| **Categories** | 12 | IFRS, TAX, ISA, BIG4, PRO, REG, ETHICS, RESEARCH, etc. |
| **Jurisdictions** | 7+ | GLOBAL (140), MT (19), RW (15), US, UK, CA, AU, EU |

### Category Breakdown

```
IFRS (~30)       IFRS Foundation, IAS Plus, Big4 IFRS guidance
TAX (~60)        OECD, Malta CFR, Rwanda RRA, global authorities
ISA (~14)        IAASB audit standards
BIG4 (~24)       KPMG, PwC, Deloitte, EY insights
PRO (~11)        ACCA, AICPA, CPA Canada, ICAEW, CIMA
REG (~15)        MFSA, ESMA, SEC, PCAOB, FRC
ETHICS (~4)      IESBA Code of Ethics
RESEARCH (~5)    Google Scholar, JSTOR, SSRN
Others (~37)     ESG, Law, Banking, Insurance, Tech
```

---

## 💻 TypeScript API

### Query Helpers

```typescript
// Get all active sources with optional filters
getActiveSources(supabase, { category?, jurisdiction?, status? })

// Get unique domains for whitelisting
getActiveDomains(supabase, filters?)

// Get primary sources (official standards bodies)
getPrimarySources(supabase, { category?, jurisdiction? })

// Get sources by category
getSourcesByCategory(supabase, category, activeOnly?)

// Get sources by jurisdiction
getSourcesByJurisdiction(supabase, jurisdiction, activeOnly?)

// Search by tags
searchByTags(supabase, tags, activeOnly?)

// Get sources needing crawl
getSourcesNeedingCrawl(supabase, daysSinceLastCrawl?, limit?)

// Get single source
getSourceById(supabase, id)
```

### Mutation Helpers

```typescript
// Create new source
createSource(supabase, {
  name: 'Source Name',
  url: 'https://example.com',
  domain: 'example.com',
  category: 'IFRS',
  jurisdiction_code: 'GLOBAL',
  authority_level: 'PRIMARY',
  priority: 1,
  tags: ['ifrs', 'accounting']
})

// Update source
updateSource(supabase, id, { name: 'New Name' })

// Toggle ACTIVE ↔ INACTIVE
toggleSourceStatus(supabase, id)

// Mark as crawled
markSourceCrawled(supabase, id)

// Delete source
deleteSource(supabase, id)

// Bulk update
bulkUpdateSources(supabase, 
  { domain: 'example.com' },
  { status: 'INACTIVE' }
)
```

### Analytics Helpers

```typescript
// Get crawl statistics
const stats = await getCrawlStats(supabase);
// Returns: { total, active, inactive, neverCrawled, recentlyCrawled, stale }

// Get category distribution
const categoryCounts = await getSourceCountByCategory(supabase);
// Returns: { 'IFRS': 30, 'TAX': 60, ... }

// Get jurisdiction distribution
const jurisdictionCounts = await getSourceCountByJurisdiction(supabase);
// Returns: { 'GLOBAL': 140, 'MT': 19, ... }
```

---

## 🎯 Use Cases

### 1. DeepSearch Integration

```typescript
import { getActiveDomains } from '@prisma/lib';

// Get domains for crawler whitelist
const domains = await getActiveDomains(supabase);

// Use in search API
const results = await searchWeb(query, {
  allowedDomains: domains,
  prioritizePrimary: true
});
```

### 2. Scheduled Crawler

```typescript
import { getSourcesNeedingCrawl, markSourceCrawled } from '@prisma/lib';

// Get sources not crawled in last 7 days
const batch = await getSourcesNeedingCrawl(supabase, 7, 100);

for (const source of batch) {
  try {
    const content = await crawlUrl(source.url);
    await indexContent(content);
    await markSourceCrawled(supabase, source.id);
    console.log(`✓ Crawled: ${source.name}`);
  } catch (error) {
    console.error(`✗ Failed: ${source.name}`, error);
  }
}
```

### 3. RAG Ingestion Pipeline

```typescript
import { getPrimarySources } from '@prisma/lib';

// Prioritize primary sources for RAG
const primarySources = await getPrimarySources(supabase, {
  category: 'IFRS'
});

// Ingest in priority order
for (const source of primarySources.sort((a, b) => a.priority - b.priority)) {
  await ingestToRAG(source.url, {
    metadata: {
      category: source.category,
      jurisdiction: source.jurisdiction_code,
      authorityLevel: source.authority_level
    }
  });
}
```

### 4. Admin Operations

```typescript
// Get analytics for dashboard
const stats = await getCrawlStats(supabase);
const categoryCounts = await getSourceCountByCategory(supabase);

// Filter sources by category
const taxSources = await getSourcesByCategory(supabase, 'TAX');

// Deactivate outdated sources
await bulkUpdateSources(
  supabase,
  { domain: 'deprecated-site.com' },
  { status: 'INACTIVE' }
);

// Add new source
await createSource(supabase, {
  name: 'New Tax Authority',
  url: 'https://newtax.gov',
  domain: 'newtax.gov',
  category: 'TAX',
  jurisdiction_code: 'US',
  authority_level: 'PRIMARY',
  priority: 1
});
```

---

## 🎨 Admin Panel Features

### Dashboard View

```
┌─────────────────────────────────────────────────────────────────┐
│ Web Knowledge Sources                         [Refresh] [+ Add] │
│ Manage 200 curated web sources for AI agent learning           │
├─────────────────────────────────────────────────────────────────┤
│  Total: 200  │  Active: 200  │  Never: 150  │  Recent: 30  │  Stale: 20│
├─────────────────────────────────────────────────────────────────┤
│ [Search...        ] [Category ▼] [Jurisdiction ▼]              │
├─────────────────────────────────────────────────────────────────┤
│ Sources (200)                          [All] [Active] [Inactive]│
│                                                                 │
│ ✓ IFRS - Issued Standards                    [⚡][👁][✏][🗑]   │
│   https://www.ifrs.org/issued-standards/                       │
│   IFRS  GLOBAL  Priority 1  PRIMARY  Crawled 2024-11-15       │
│                                                                 │
│ ✓ IAASB - ISA Focus Area                     [⚡][👁][✏][🗑]   │
│   https://www.iaasb.org/focus-areas/...                       │
│   ISA  GLOBAL  Priority 1  PRIMARY  Never crawled             │
└─────────────────────────────────────────────────────────────────┘
```

### Features

- **Real-time Stats**: Total, active, never crawled, recent (7d), stale (30d+)
- **Advanced Search**: Name, URL, domain
- **Filters**: Category, jurisdiction, status, authority level
- **Actions**: Toggle status, view, edit, delete
- **Visualizations**: Category distribution, crawl status
- **Bulk Operations**: Update multiple sources at once

---

## 🔧 Database Schema

```sql
CREATE TABLE knowledge_web_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    url text NOT NULL,
    domain text NOT NULL,
    category text NOT NULL,
    jurisdiction_code text DEFAULT 'GLOBAL',
    authority_level text NOT NULL DEFAULT 'SECONDARY'
        CHECK (authority_level IN ('PRIMARY', 'SECONDARY', 'INTERNAL')),
    status text NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'INACTIVE')),
    priority int NOT NULL DEFAULT 1,
    tags text[] DEFAULT '{}',
    notes text,
    last_crawled_at timestamptz,
    created_by uuid,
    updated_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_kws_domain ON knowledge_web_sources (domain);
CREATE INDEX idx_kws_category ON knowledge_web_sources (category);
CREATE INDEX idx_kws_jurisdiction ON knowledge_web_sources (jurisdiction_code);
CREATE INDEX idx_kws_status ON knowledge_web_sources (status);
CREATE INDEX idx_kws_authority_level ON knowledge_web_sources (authority_level);
CREATE INDEX idx_kws_priority ON knowledge_web_sources (priority);
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `KNOWLEDGE_WEB_SOURCES_COMPLETE.md` | Complete implementation guide with all details |
| `README_KNOWLEDGE_WEB_SOURCES.md` | Quick reference card |
| `docs/KNOWLEDGE_WEB_SOURCES_GUIDE.md` | Integration guide with examples |
| `APPLY_MIGRATION_INSTRUCTIONS.md` | Migration setup instructions |
| `packages/lib/src/knowledge-web-sources.ts` | TypeScript API (with JSDoc) |

---

## ✅ Verification Checklist

After applying the migration:

- [ ] Table exists: `SELECT * FROM knowledge_web_sources LIMIT 1;`
- [ ] 200 rows: `SELECT COUNT(*) FROM knowledge_web_sources;`
- [ ] Indexes created: `SELECT indexname FROM pg_indexes WHERE tablename = 'knowledge_web_sources';`
- [ ] Categories: `SELECT DISTINCT category FROM knowledge_web_sources ORDER BY category;`
- [ ] Jurisdictions: `SELECT DISTINCT jurisdiction_code FROM knowledge_web_sources ORDER BY jurisdiction_code;`
- [ ] Admin panel works: Navigate to `/admin/knowledge/sources`
- [ ] TypeScript imports: `import { getActiveDomains } from '@prisma/lib';`

---

## 🎯 Key Benefits

✓ **Centralized Management** - All 200 URLs in one database table  
✓ **Dynamic Configuration** - Query by category, jurisdiction, priority  
✓ **Crawl Tracking** - Track `last_crawled_at` timestamps  
✓ **Type-Safe Operations** - Full TypeScript support  
✓ **Admin-Friendly UI** - Beautiful management interface  
✓ **Flexible Filtering** - By category, jurisdiction, authority, tags  
✓ **Production Ready** - Constraints, indexes, RLS-ready  

---

## 🚨 Important Notes

### Migration Status
⚠️ **The migration has NOT been applied yet.** You must apply it manually via Supabase Studio (see Step 1 above).

### Integration Points
- **DeepSearch**: Use `getActiveDomains()` for domain whitelisting
- **Crawler**: Use `getSourcesNeedingCrawl()` for scheduling
- **RAG Ingestion**: Use `getPrimarySources()` to prioritize official sources
- **Admin Panel**: Manage via UI at `/admin/knowledge/sources`

### RLS Policies (Optional)
If you need multi-tenant support, add RLS policies:

```sql
ALTER TABLE knowledge_web_sources ENABLE ROW LEVEL SECURITY;

-- Example: Allow all authenticated users to read
CREATE POLICY "Allow authenticated read" ON knowledge_web_sources
    FOR SELECT TO authenticated USING (true);

-- Example: Only admins can modify
CREATE POLICY "Allow admin modify" ON knowledge_web_sources
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');
```

---

## 🆘 Troubleshooting

**Q: Migration fails with "relation already exists"**  
A: Table was already created. Check row count: `SELECT COUNT(*) FROM knowledge_web_sources;`

**Q: TypeScript import errors**  
A: Ensure `@prisma/lib` is in your dependencies and run `pnpm install`

**Q: Admin panel shows "No sources found"**  
A: Migration wasn't applied or sources have `status = 'INACTIVE'`. Check with SQL.

**Q: Can't access admin panel**  
A: Ensure you're authenticated and have access to `/admin` routes.

---

## 📞 Support

- **Quick Start**: This README
- **Full Guide**: `KNOWLEDGE_WEB_SOURCES_COMPLETE.md`
- **API Reference**: `packages/lib/src/knowledge-web-sources.ts` (JSDoc)
- **Migration Help**: `APPLY_MIGRATION_INSTRUCTIONS.md`

---

**Status**: ✅ Complete and ready to deploy  
**Created**: 2025-12-01  
**Version**: 1.0.0  
**Total Files**: 10 files (~86KB)  
**Total URLs**: 200 curated sources  

---

## 🚀 Get Started Now!

1. **Apply migration** → Supabase SQL Editor (5 min)
2. **Visit admin panel** → `/admin/knowledge/sources`
3. **Start coding** → `import { getActiveDomains } from '@prisma/lib';`

**See `KNOWLEDGE_WEB_SOURCES_COMPLETE.md` for complete documentation!** 🎉
