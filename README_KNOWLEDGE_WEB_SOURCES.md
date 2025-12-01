# Knowledge Web Sources - Setup Complete ✅

## What Was Created

### 1. Database Migration
**File**: `supabase/migrations/20251201_knowledge_web_sources_200_urls.sql`
- ✅ Creates `knowledge_web_sources` table
- ✅ Seeds 200 trusted URLs across:
  - 12 IFRS Foundation URLs
  - 14 IAASB/IESBA/IFAC URLs
  - 24 Big4 URLs (KPMG, PwC, Deloitte, EY)
  - 8 OECD Tax URLs
  - 19 Malta URLs (CFR, MBR, MFSA, FIAU)
  - 15 Rwanda URLs (RRA, RDB, BNR)
  - 108 additional global sources
- ✅ Includes 6 indexes for performance
- ✅ Check constraints on `authority_level` and `status`

### 2. TypeScript Helper Module
**File**: `packages/lib/src/knowledge-web-sources.ts`
- ✅ Type-safe interfaces for all operations
- ✅ Query helpers (getActiveSources, getPrimarySources, etc.)
- ✅ Mutation helpers (createSource, updateSource, toggleStatus, etc.)
- ✅ Analytics helpers (getCrawlStats, getSourceCountByCategory, etc.)
- ✅ Fully documented with JSDoc comments

### 3. Integration Guide
**File**: `docs/KNOWLEDGE_WEB_SOURCES_GUIDE.md`
- ✅ Complete setup instructions
- ✅ Usage examples for DeepSearch, admin panel, crawler
- ✅ API endpoint templates
- ✅ Maintenance queries
- ✅ Best practices and troubleshooting

### 4. Git YAML Registry
**File**: `config/knowledge_web_sources.yaml`
- ✅ Canonical copy of all 200 sources in YAML format (mirrors the SQL seed)
- ✅ Easy diffing/review for future additions or edits
- ✅ Ready for future sync tooling (parse YAML → upsert DB rows)
- ✅ Includes section headers to match the migration groups

### Implementation Plan (YAML → DB Sync)
1. **Edit YAML in Git** – Update `config/knowledge_web_sources.yaml` for any source changes.
2. **Sync to Supabase** – Run `pnpm sync:knowledge-web-sources` (requires `DATABASE_URL`) to insert/update rows idempotently.
3. **Verify** – Re-run `./scripts/verify-knowledge-sources.sh` or `SELECT COUNT(*) FROM knowledge_web_sources;`.

This keeps the YAML as the reviewable source of truth and the table as its deployed replica.

## Quick Start

### Step 1: Apply Migration

```bash
# Option A: Direct psql (requires DATABASE_URL)
psql "$DATABASE_URL" -f supabase/migrations/20251201_knowledge_web_sources_200_urls.sql

# Option B: Supabase CLI
supabase db push

# Option C: Supabase Studio
# Upload the SQL file in SQL Editor
```

### Step 2: Verify Installation

```sql
-- Check count (should be 200)
SELECT COUNT(*) FROM knowledge_web_sources;

-- View breakdown
SELECT category, jurisdiction_code, COUNT(*) 
FROM knowledge_web_sources 
GROUP BY category, jurisdiction_code 
ORDER BY category;

-- Or use the Git-driven sync script (after editing YAML)
DATABASE_URL=postgres://... pnpm sync:knowledge-web-sources
```

### Step 3: Use in Your Code

```typescript
import { createClient } from '@supabase/supabase-js';
import { getActiveDomains, getPrimarySources } from '@/packages/lib/src/knowledge-web-sources';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

// Get all domains for crawler whitelist
const domains = await getActiveDomains(supabase);
console.log(`Found ${domains.length} unique domains`);

// Get primary IFRS sources
const ifrsSources = await getPrimarySources(supabase, { category: 'IFRS' });
console.log(`Found ${ifrsSources.length} primary IFRS sources`);
```

## Table Schema

```typescript
interface KnowledgeWebSource {
  id: string;
  name: string;                    // "IFRS - Issued Standards"
  url: string;                     // "https://www.ifrs.org/issued-standards/"
  domain: string;                  // "ifrs.org"
  category: string;                // "IFRS", "TAX", "ISA", etc.
  jurisdiction_code: string;       // "GLOBAL", "RW", "MT", etc.
  authority_level: 'PRIMARY' | 'SECONDARY' | 'INTERNAL';
  status: 'ACTIVE' | 'INACTIVE';
  priority: number;                // 1=core, 2=important, 3+=secondary
  tags: string[];                  // ['ifrs', 'standards']
  notes: string | null;
  last_crawled_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}
```

## Categories Breakdown

| Category | Count | Example Sources |
|----------|-------|-----------------|
| IFRS | ~30 | IFRS Foundation, IAS Plus, Big4 IFRS guidance |
| TAX | ~60 | OECD, Malta CFR, Rwanda RRA, global tax authorities |
| ISA | ~14 | IAASB standards, audit guidance |
| BIG4 | ~24 | KPMG, PwC, Deloitte, EY insights |
| PRO | ~11 | ACCA, AICPA, CPA Canada |
| REG | ~15 | MFSA, ESMA, SEC, PCAOB |
| ETHICS | ~4 | IESBA Code of Ethics |
| RESEARCH | ~5 | Google Scholar, JSRN, ResearchGate |
| Others | ~37 | ESG, Law, Banking, Insurance, Tech |

## Jurisdictions

- **GLOBAL**: 140 sources (international standards, Big4, professional bodies)
- **MT** (Malta): 19 sources (CFR, MBR, MFSA, FIAU)
- **RW** (Rwanda): 15 sources (RRA, RDB, BNR, Parliament)
- **US/UK/CA/AU/EU**: 26 sources (tax authorities, regulators)

## Common Operations

### Get Active Domains for Crawler
```typescript
const domains = await getActiveDomains(supabase);
// Returns: ['ifrs.org', 'iaasb.org', 'kpmg.com', 'pwc.com', ...]
```

### Get Sources Needing Crawl
```typescript
const sources = await getSourcesNeedingCrawl(supabase, 7, 50);
// Returns: 50 sources not crawled in last 7 days
```

### Get Tax Sources for Rwanda
```typescript
const rwTax = await getActiveSources(supabase, {
  category: 'TAX',
  jurisdiction: 'RW'
});
// Returns: RRA Income Tax, VAT, Excise, etc.
```

### Mark Source as Crawled
```typescript
await markSourceCrawled(supabase, sourceId);
// Updates last_crawled_at to current timestamp
```

## Integration Points

### 1. DeepSearch Tool
Query `knowledge_web_sources` to build the allowed domains list dynamically:

```typescript
const sources = await getActiveSources(supabase, { 
  authority_level: 'PRIMARY',
  priority: 1 
});
const domains = sources.map(s => s.domain);
// Use domains in your web search configuration
```

### 2. Admin Panel
Create CRUD interface for managing sources:
- List all sources with filters (category, jurisdiction, status)
- Toggle ACTIVE/INACTIVE status
- Add new sources
- Edit existing sources
- View crawl statistics

### 3. Crawler Pipeline
Use `getSourcesNeedingCrawl()` to schedule crawls:

```typescript
const batch = await getSourcesNeedingCrawl(supabase, 7, 100);
for (const source of batch) {
  await crawlUrl(source.url);
  await markSourceCrawled(supabase, source.id);
}
```

### 4. RAG Ingestion
Filter by priority and authority level:

```typescript
const coreSources = await getActiveSources(supabase, {
  authority_level: 'PRIMARY',
  priority: 1
});
// Ingest these first for maximum quality
```

## Best Practices

1. **Always query with `status = 'ACTIVE'`** for production
2. **Order by priority** to focus on authoritative sources
3. **Filter by jurisdiction** for localized queries
4. **Use tags** for flexible search
5. **Update `last_crawled_at`** after successful crawls
6. **Set `authority_level = 'PRIMARY'`** only for official bodies

## Next Steps

1. ✅ Migration created and documented
2. ⬜ Apply migration to your database
3. ⬜ Verify with `SELECT COUNT(*) FROM knowledge_web_sources`
4. ⬜ Integrate with DeepSearch tool
5. ⬜ Build admin panel interface
6. ⬜ Configure crawler to use these sources
7. ⬜ Set up RLS policies (if needed)

## Files Created

```
supabase/migrations/
  └── 20251201_knowledge_web_sources_200_urls.sql    (33KB)

packages/lib/src/
  └── knowledge-web-sources.ts                       (14KB)

docs/
  └── KNOWLEDGE_WEB_SOURCES_GUIDE.md                 (13KB)

README_KNOWLEDGE_WEB_SOURCES.md                      (this file)
```

## Verification Queries

```sql
-- Total count
SELECT COUNT(*) FROM knowledge_web_sources;
-- Expected: 200

-- By category
SELECT category, COUNT(*) 
FROM knowledge_web_sources 
GROUP BY category 
ORDER BY COUNT(*) DESC;

-- By jurisdiction
SELECT jurisdiction_code, COUNT(*) 
FROM knowledge_web_sources 
GROUP BY jurisdiction_code 
ORDER BY COUNT(*) DESC;

-- Unique domains
SELECT COUNT(DISTINCT domain) FROM knowledge_web_sources;
-- Expected: ~80-90

-- Primary sources
SELECT COUNT(*) 
FROM knowledge_web_sources 
WHERE authority_level = 'PRIMARY';
-- Expected: ~70-80
```

## Support

- **Migration Issues**: Check `docs/KNOWLEDGE_WEB_SOURCES_GUIDE.md` → Troubleshooting
- **TypeScript Usage**: See `packages/lib/src/knowledge-web-sources.ts` JSDoc
- **Integration Examples**: See `docs/KNOWLEDGE_WEB_SOURCES_GUIDE.md` → Usage Examples

---

**Created**: 2025-12-01  
**Migration**: `20251201_knowledge_web_sources_200_urls.sql`  
**Status**: ✅ Ready to apply
