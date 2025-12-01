# RAG Ingestion Pipeline - Quick Start

## 🚀 5-Minute Setup

### Prerequisites

- ✅ Node.js 22+
- ✅ pnpm 9.12.3+
- ✅ Supabase project with DATABASE_URL
- ✅ OpenAI API key

### Step 1: Verify Setup (30 seconds)

```bash
./scripts/verify-rag-setup.sh
```

**Expected output**:
```
✅ Checking files... (5 files found)
✅ Checking dependencies... (5 deps in package.json)
✅ Checking environment variables... (set before running)
✅ Checking package.json scripts... (ingest:web defined)
```

### Step 2: Install Dependencies (2 minutes)

```bash
pnpm install --frozen-lockfile
```

This installs:
- `@supabase/supabase-js` - Database client
- `openai` - Embeddings API
- `jsdom` - HTML parsing
- `pdf-parse` - PDF text extraction
- `js-sha256` - Content hashing

### Step 3: Apply Database Migration (1 minute)

```bash
# Option A: Using psql
psql "$DATABASE_URL" -f supabase/migrations/20260201160000_rag_ingestion_pipeline.sql

# Option B: Using Supabase CLI
supabase db push
```

**Creates**:
- ✅ `knowledge_web_pages` table (200 URLs pre-seeded)
- ✅ `knowledge_chunks` table (vector store)
- ✅ `deep_search_knowledge()` function
- ✅ pgvector indexes

### Step 4: Set Environment Variables (30 seconds)

```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
export OPENAI_API_KEY=sk-...
```

Or create `.env.local`:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
OPENAI_API_KEY=sk-...
```

### Step 5: Run First Ingestion (2-5 minutes)

```bash
pnpm run ingest:web
```

**Output**:
```
🚀 Starting knowledge ingestion from web sources...
   Max pages per run: 25
   Chunk size: 4000 chars
   Embedding model: text-embedding-3-large

📊 Found 25 pages to process.

📄 Processing: https://www.ifrs.org/issued-standards/list-of-standards/ias-1/
   📝 Created 12 chunks
   🧠 Generated 12 embeddings
✅ Ingested 12 chunks for https://www.ifrs.org/...

[... 24 more pages ...]

✅ Ingestion run completed successfully!
```

### Step 6: Verify Ingestion (30 seconds)

```sql
-- Check status
psql "$DATABASE_URL" -c "
  select status, count(*) 
  from knowledge_web_pages 
  group by status;
"

-- Expected: 25 ACTIVE, 175 pending

-- Check chunks
psql "$DATABASE_URL" -c "
  select 
    category,
    count(*) as chunks
  from knowledge_chunks
  group by category;
"

-- Expected: ~200-300 chunks (varies by content)
```

---

## 🔁 Complete Full Ingestion (All 200 URLs)

Run ingestion 8 times (200 ÷ 25 = 8 batches):

```bash
for i in {1..8}; do
  echo "=== Batch $i/8 ==="
  pnpm run ingest:web
  sleep 60  # Wait 1 minute between batches
done
```

**Total time**: ~20-30 minutes  
**Total cost**: ~$0.26 (OpenAI embeddings)

---

## 🤖 Test with Agent

```typescript
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 1. Embed query
const response = await openai.embeddings.create({
  model: "text-embedding-3-large",
  input: "What is the VAT rate in Rwanda?"
});

// 2. Search knowledge base
const { data } = await supabase.rpc('deep_search_knowledge', {
  query_embedding: response.data[0].embedding,
  p_category: 'TAX',
  p_jurisdiction: 'RW',
  p_limit: 5
});

// 3. Use results
console.log(data);
```

---

## 🔧 Configure Scheduled Ingestion

### GitHub Actions (Recommended)

1. Add secrets to GitHub repo:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `DATABASE_URL` (optional, for stats)

2. Enable workflow:
   - File: `.github/workflows/rag-ingestion.yml`
   - Schedule: Daily at 2 AM UTC
   - Manual trigger: Actions tab → RAG Ingestion Pipeline → Run workflow

### Alternative: pg_cron (Supabase)

```sql
-- Requires Supabase Edge Function
select cron.schedule(
  'rag-ingestion',
  '0 2 * * *',  -- Daily at 2 AM
  $$
  select net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/ingest-knowledge',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'
  )
  $$
);
```

---

## 📊 Monitoring Dashboard

```sql
-- Create monitoring view
create or replace view rag_ingestion_stats as
select 
  (select count(*) from knowledge_web_pages where status = 'ACTIVE') as active_pages,
  (select count(*) from knowledge_web_pages where status = 'ERROR') as error_pages,
  (select count(*) from knowledge_chunks) as total_chunks,
  (select count(distinct category) from knowledge_chunks) as categories,
  (select count(distinct jurisdiction_code) from knowledge_chunks) as jurisdictions,
  (select max(last_fetched_at) from knowledge_web_pages) as last_ingestion_at,
  (select count(*) from knowledge_web_pages where last_fetched_at < now() - interval '30 days') as stale_pages;

-- Query stats
select * from rag_ingestion_stats;
```

---

## 🐛 Troubleshooting

### Issue: Dependencies not installing

```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Issue: HTTP errors during ingestion

```sql
-- Check errors
select url, http_status, fetch_error 
from knowledge_web_pages 
where status = 'ERROR';

-- Retry failed pages
update knowledge_web_pages 
set status = 'ACTIVE', sha256_hash = null 
where status = 'ERROR';

pnpm run ingest:web
```

### Issue: Embedding dimension mismatch

```sql
-- Check vector dimensions
select 
  id, 
  array_length(embedding::float[], 1) as dim 
from knowledge_chunks 
where embedding is not null 
limit 5;

-- Expected: 1536 for text-embedding-3-large
```

### Issue: No results from search

```sql
-- Verify embeddings are populated
select count(*) from knowledge_chunks where embedding is not null;

-- Test search with existing embedding
select * from deep_search_knowledge(
  query_embedding := (select embedding from knowledge_chunks limit 1),
  p_limit := 5
);
```

---

## 📚 Full Documentation

- **README**: `RAG_INGESTION_PIPELINE_README.md` (complete guide)
- **Summary**: `RAG_INGESTION_PIPELINE_SUMMARY.md` (implementation details)
- **Verification**: `scripts/verify-rag-setup.sh` (setup checker)

---

## ✅ Success Checklist

- [ ] Migration applied (`knowledge_web_pages`, `knowledge_chunks` tables exist)
- [ ] Dependencies installed (`pnpm list openai jsdom pdf-parse`)
- [ ] Environment variables set (`SUPABASE_URL`, `OPENAI_API_KEY`)
- [ ] First ingestion run completed (25+ pages processed)
- [ ] Chunks visible in database (`select count(*) from knowledge_chunks`)
- [ ] `deep_search_knowledge()` function works
- [ ] GitHub Action configured (optional, for scheduled runs)

---

**Need help?** Check `RAG_INGESTION_PIPELINE_README.md` for detailed troubleshooting.
