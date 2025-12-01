# Knowledge Web Sources - Integration Guide

## Overview

The `knowledge_web_sources` table stores 200 curated, trusted URLs for AI agent learning across accounting, tax, audit, and regulatory domains.

The same dataset now lives in Git as `config/knowledge_web_sources.yaml`, making it easy to propose edits, review diffs, or bootstrap future sync scripts that compare the YAML registry with the live database.

## Quick Start

### 1. Apply the Migration

```bash
# Option A: Using psql directly (if DATABASE_URL is set)
psql "$DATABASE_URL" -f supabase/migrations/20251201_knowledge_web_sources_200_urls.sql

# Option B: Using Supabase CLI
supabase db push

# Option C: Via Supabase Studio
# Upload the migration file through the SQL Editor
```

### 2. Verify Installation

```sql
-- Check total count (should be 200)
SELECT COUNT(*) FROM knowledge_web_sources;

-- View breakdown by category
SELECT 
    category, 
    jurisdiction_code, 
    COUNT(*) as url_count,
    COUNT(CASE WHEN authority_level = 'PRIMARY' THEN 1 END) as primary_sources
FROM knowledge_web_sources 
GROUP BY category, jurisdiction_code 
ORDER BY category, jurisdiction_code;

-- View by domain
SELECT 
    domain, 
    COUNT(*) as page_count,
    authority_level,
    status
FROM knowledge_web_sources 
GROUP BY domain, authority_level, status
ORDER BY page_count DESC
LIMIT 20;
```

## Table Schema

```sql
CREATE TABLE knowledge_web_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,                  -- Human-readable label
    url text NOT NULL,                   -- Full URL
    domain text NOT NULL,                -- Domain for grouping
    category text NOT NULL,              -- IFRS, ISA, TAX, BIG4, etc.
    jurisdiction_code text DEFAULT 'GLOBAL',  -- ISO code or GLOBAL
    authority_level text NOT NULL DEFAULT 'SECONDARY',  -- PRIMARY|SECONDARY|INTERNAL
    status text NOT NULL DEFAULT 'ACTIVE',               -- ACTIVE|INACTIVE
    priority int NOT NULL DEFAULT 1,     -- 1=core, higher=less important
    tags text[] DEFAULT '{}',            -- Searchable tags
    notes text,                          -- Admin notes
    last_crawled_at timestamptz,         -- Last successful crawl
    created_by uuid,                     -- User who created
    updated_by uuid,                     -- User who last updated
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

## Categories

| Category | Count | Description |
|----------|-------|-------------|
| **IFRS** | ~30 | IFRS Foundation, IAS Plus, Big4 IFRS guidance |
| **ISA** | ~14 | IAASB standards, audit guidance |
| **TAX** | ~60 | OECD, Malta CFR, Rwanda RRA, global tax authorities |
| **BIG4** | ~24 | KPMG, PwC, Deloitte, EY (non-IFRS content) |
| **PRO** | ~11 | ACCA, AICPA, CPA Canada, ICAEW, CIMA |
| **REG** | ~15 | MFSA, ESMA, SEC, PCAOB, FRC |
| **CORP** | ~10 | MBR, RDB, company registries |
| **ETHICS** | ~4 | IESBA, ethics codes |
| **RESEARCH** | ~5 | Google Scholar, JSTOR, SSRN |
| **LAW** | ~8 | EUR-Lex, Cornell LII, legal resources |
| **Others** | ~19 | ESG, Banking, Insurance, Public Sector, Tech |

## Jurisdictions

- **GLOBAL**: 140 sources (IFRS, OECD, Big4, professional bodies)
- **MT** (Malta): 19 sources (CFR, MBR, MFSA, FIAU)
- **RW** (Rwanda): 15 sources (RRA, RDB, BNR)
- **US, UK, CA, AU, EU**: 26 sources (tax authorities, regulators)

## Usage Examples

### For DeepSearch Integration

```typescript
// Fetch all active domains for web search
const activeSources = await supabase
  .from('knowledge_web_sources')
  .select('domain, url, authority_level, priority')
  .eq('status', 'ACTIVE')
  .order('priority', { ascending: true });

// Build domain whitelist for crawling
const domains = [...new Set(activeSources.data.map(s => s.domain))];

// Filter by category
const taxSources = await supabase
  .from('knowledge_web_sources')
  .select('url, name')
  .eq('category', 'TAX')
  .eq('status', 'ACTIVE')
  .lte('priority', 2); // Only priority 1-2

// Filter by jurisdiction
const rwandaSources = await supabase
  .from('knowledge_web_sources')
  .select('*')
  .eq('jurisdiction_code', 'RW')
  .eq('status', 'ACTIVE');

// Search by tags
const vatrSources = await supabase
  .from('knowledge_web_sources')
  .select('*')
  .contains('tags', ['vat']);

// Get primary sources only (official standards bodies)
const primarySources = await supabase
  .from('knowledge_web_sources')
  .select('*')
  .eq('authority_level', 'PRIMARY')
  .eq('status', 'ACTIVE')
  .order('priority', { ascending: true });
```

### For Admin Panel

```typescript
// List all sources with filters
export async function listSources(filters?: {
  category?: string;
  jurisdiction?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  domain?: string;
}) {
  let query = supabase
    .from('knowledge_web_sources')
    .select('*')
    .order('priority', { ascending: true })
    .order('name', { ascending: true });

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.jurisdiction) {
    query = query.eq('jurisdiction_code', filters.jurisdiction);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.domain) {
    query = query.eq('domain', filters.domain);
  }

  return await query;
}

// Toggle source status
export async function toggleSourceStatus(id: string, currentStatus: string) {
  const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  return await supabase
    .from('knowledge_web_sources')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id);
}

// Add new source
export async function addSource(data: {
  name: string;
  url: string;
  domain: string;
  category: string;
  jurisdiction_code?: string;
  authority_level?: 'PRIMARY' | 'SECONDARY' | 'INTERNAL';
  priority?: number;
  tags?: string[];
  notes?: string;
}) {
  return await supabase
    .from('knowledge_web_sources')
    .insert([{
      ...data,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }]);
}

// Update crawl timestamp
export async function markCrawled(id: string) {
  return await supabase
    .from('knowledge_web_sources')
    .update({ 
      last_crawled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
}
```

### For Crawling Pipeline

```typescript
// Get sources that need crawling (not crawled in last 7 days)
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const sourcesToCrawl = await supabase
  .from('knowledge_web_sources')
  .select('*')
  .eq('status', 'ACTIVE')
  .or(`last_crawled_at.is.null,last_crawled_at.lt.${sevenDaysAgo.toISOString()}`)
  .order('priority', { ascending: true })
  .limit(50); // Batch size

// Process each URL
for (const source of sourcesToCrawl.data) {
  try {
    await crawlUrl(source.url);
    await markCrawled(source.id);
  } catch (error) {
    console.error(`Failed to crawl ${source.name}:`, error);
  }
}
```

## Row-Level Security (RLS)

If using RLS, add these policies:

```sql
-- Allow authenticated users to read all sources
CREATE POLICY "Users can view knowledge sources"
  ON knowledge_web_sources
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow admins to manage sources
CREATE POLICY "Admins can manage knowledge sources"
  ON knowledge_web_sources
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Enable RLS
ALTER TABLE knowledge_web_sources ENABLE ROW LEVEL SECURITY;
```

## API Endpoints

Create these endpoints in your API:

### GET /api/knowledge/sources

```typescript
// List all sources with filters
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const jurisdiction = searchParams.get('jurisdiction');
  const status = searchParams.get('status') || 'ACTIVE';

  const sources = await listSources({ category, jurisdiction, status });
  return Response.json(sources);
}
```

### GET /api/knowledge/domains

```typescript
// Get unique domains for crawler configuration
export async function GET() {
  const { data } = await supabase
    .from('knowledge_web_sources')
    .select('domain')
    .eq('status', 'ACTIVE');

  const domains = [...new Set(data.map(s => s.domain))];
  return Response.json({ domains, count: domains.length });
}
```

### POST /api/knowledge/sources

```typescript
// Add new source (admin only)
export async function POST(request: Request) {
  const body = await request.json();
  const result = await addSource(body);
  return Response.json(result);
}
```

### PATCH /api/knowledge/sources/:id

```typescript
// Update source status or metadata
export async function PATCH(request: Request, { params }) {
  const body = await request.json();
  const result = await supabase
    .from('knowledge_web_sources')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id);
  return Response.json(result);
}
```

## Maintenance Tasks

### Update Crawl Timestamps

```sql
-- Mark all sources as never crawled (reset)
UPDATE knowledge_web_sources 
SET last_crawled_at = NULL 
WHERE status = 'ACTIVE';

-- Find stale sources (not crawled in 30 days)
SELECT name, url, last_crawled_at
FROM knowledge_web_sources
WHERE status = 'ACTIVE'
  AND (last_crawled_at IS NULL OR last_crawled_at < NOW() - INTERVAL '30 days')
ORDER BY priority, last_crawled_at NULLS FIRST;
```

### Bulk Updates

```sql
-- Deactivate all sources from a specific domain
UPDATE knowledge_web_sources 
SET status = 'INACTIVE', updated_at = NOW()
WHERE domain = 'example.com';

-- Update priority for all IFRS sources
UPDATE knowledge_web_sources 
SET priority = 1, updated_at = NOW()
WHERE category = 'IFRS' AND authority_level = 'PRIMARY';

-- Add tags to all Malta sources
UPDATE knowledge_web_sources 
SET tags = array_append(tags, 'malta-gov'), updated_at = NOW()
WHERE jurisdiction_code = 'MT';
```

### Git Registry Sync (YAML)

Run `DATABASE_URL=postgres://... pnpm sync:knowledge-web-sources` to load the YAML registry and apply inserts/updates idempotently. Pass `--dry-run` to preview changes without touching the database.

Implementation plan:

1. Edit `config/knowledge_web_sources.yaml` to add/remove/update sources with full metadata (name, URL, category, tags, etc.).
2. Execute the sync script (or equivalent CI step) to compare YAML vs. database and apply changes.
3. Keep the YAML as the review-friendly source of truth and treat the database as a replica populated from Git.

If your database enforces `UNIQUE (url)` the script automatically skips any duplicate URLs from the YAML and lists them in the output so you can decide whether to adjust the registry or relax the constraint.

Example TypeScript snippet:

```ts
import fs from 'node:fs';
import yaml from 'js-yaml';
import { createClient } from '@supabase/supabase-js';

type Registry = {
  version: number;
  sources: Array<{
    name: string;
    url: string;
    domain: string;
    category: string;
    jurisdiction_code: string;
    authority_level: string;
    status: string;
    priority: number;
    tags: string[];
    notes: string;
  }>;
};

async function main() {
  const registry = yaml.load(fs.readFileSync('config/knowledge_web_sources.yaml', 'utf8')) as Registry;
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  for (const source of registry.sources) {
    await supabase.from('knowledge_web_sources').upsert({
      name: source.name,
      url: source.url,
      domain: source.domain,
      category: source.category,
      jurisdiction_code: source.jurisdiction_code,
      authority_level: source.authority_level,
      status: source.status,
      priority: source.priority,
      tags: source.tags,
      notes: source.notes,
    }, { onConflict: 'name' });
  }
}

main().catch((error) => {
  console.error('Failed to sync knowledge web sources', error);
  process.exitCode = 1;
});
```

> Tip: wrap the upsert in a transaction and log deletions if the YAML ever drops an entry.

### Analytics Queries

```sql
-- Authority distribution
SELECT authority_level, COUNT(*) 
FROM knowledge_web_sources 
GROUP BY authority_level;

-- Top domains by page count
SELECT domain, COUNT(*) as pages
FROM knowledge_web_sources
WHERE status = 'ACTIVE'
GROUP BY domain
ORDER BY pages DESC
LIMIT 10;

-- Crawl status
SELECT 
  COUNT(*) FILTER (WHERE last_crawled_at IS NULL) as never_crawled,
  COUNT(*) FILTER (WHERE last_crawled_at > NOW() - INTERVAL '7 days') as recent,
  COUNT(*) FILTER (WHERE last_crawled_at < NOW() - INTERVAL '30 days') as stale
FROM knowledge_web_sources
WHERE status = 'ACTIVE';
```

## Priority Guidelines

- **Priority 1**: Core official sources (IFRS standards, IAASB ISA, primary tax authorities)
- **Priority 2**: Important interpretive guidance (Big4 technical, secondary regulators)
- **Priority 3**: News, updates, general resources
- **Priority 4+**: Optional/supplementary sources

## Best Practices

1. **Always query with status = 'ACTIVE'** for production crawling
2. **Use priority ordering** to focus on authoritative sources first
3. **Filter by jurisdiction** for localized queries
4. **Tag liberally** for flexible search and filtering
5. **Update `last_crawled_at`** after successful crawls
6. **Use `notes` field** for maintenance comments (e.g., "Requires authentication", "PDF only")
7. **Set authority_level = 'PRIMARY'** only for official standards bodies

## Troubleshooting

**Q: Migration fails with "relation already exists"**
- A: The table already exists. Drop it first: `DROP TABLE knowledge_web_sources CASCADE;`

**Q: How do I add a new URL?**
- A: Use the admin panel or run:
  ```sql
  INSERT INTO knowledge_web_sources (name, url, domain, category, jurisdiction_code, authority_level, priority, tags)
  VALUES ('New Source', 'https://example.com', 'example.com', 'TAX', 'GLOBAL', 'SECONDARY', 3, '{tax,example}');
  ```

**Q: How do I deactivate a source without deleting it?**
- A: `UPDATE knowledge_web_sources SET status = 'INACTIVE' WHERE id = 'uuid-here';`

**Q: Can I add custom categories?**
- A: Yes, the category field is text (not enum). Add any category you need.

## Migration History

- **2025-12-01**: Initial migration with 200 curated URLs
  - 12 IFRS Foundation URLs
  - 14 IAASB/IESBA/IFAC URLs
  - 24 Big4 URLs (KPMG, PwC, Deloitte, EY)
  - 8 OECD Tax URLs
  - 19 Malta URLs (CFR, MBR, MFSA, FIAU)
  - 15 Rwanda URLs (RRA, RDB, BNR)
  - 108 additional global sources

## Related Documentation

- [DeepSearch Integration](./DEEP_SEARCH_INTEGRATION.md)
- [Admin Panel Guide](./ADMIN_PANEL_GUIDE.md)
- [Crawler Configuration](./CRAWLER_CONFIG.md)
- [Agent Learning System](../AGENT_LEARNING_SYSTEM_FINAL.md)

---

**Last Updated**: 2025-12-01
**Migration File**: `supabase/migrations/20251201_knowledge_web_sources_200_urls.sql`
