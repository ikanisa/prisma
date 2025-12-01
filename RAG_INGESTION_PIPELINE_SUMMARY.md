# RAG Ingestion Pipeline - Implementation Summary

## ✅ What Was Delivered

A complete end-to-end RAG (Retrieval-Augmented Generation) ingestion pipeline that transforms your 200+ trusted knowledge sources into a searchable vector database for AI agents.

## 📦 Files Created

### 1. Database Migration
**File**: `supabase/migrations/20260201160000_rag_ingestion_pipeline.sql`

- **`knowledge_web_pages` table**: Tracks fetched content, HTTP status, SHA-256 hashes
- **`knowledge_chunks` table**: Vector store with 1536-dim embeddings (pgvector)
- **pgvector extension**: Enables vector similarity search
- **`deep_search_knowledge()` RPC**: Semantic search function with category/jurisdiction filters
- **RLS policies**: Service role full access, authenticated users read access
- **Indexes**: IVFFlat vector index, foreign keys, category/jurisdiction filters

### 2. Ingestion Worker
**File**: `scripts/ingestKnowledgeFromWeb.ts`

**What it does**:
1. Fetches up to 25 URLs per run from `knowledge_web_pages`
2. Downloads HTML or PDF content
3. Computes SHA-256 hash (skips if unchanged)
4. Extracts text using jsdom (HTML) or pdf-parse (PDF)
5. Chunks text into ~4000 char segments
6. Generates embeddings via OpenAI text-embedding-3-large
7. Stores chunks in `knowledge_chunks` with vectors
8. Updates page metadata (status, errors, timestamps)

**Features**:
- ✅ Change detection (hash-based, only re-ingest if content changed)
- ✅ Error handling (marks pages as ERROR with fetch_error message)
- ✅ Rate limiting (configurable MAX_PAGES_PER_RUN)
- ✅ Smart chunking (breaks on sentence boundaries)
- ✅ Batch inserts (50 rows at a time)
- ✅ Comprehensive logging

### 3. GitHub Actions Workflow
**File**: `.github/workflows/rag-ingestion.yml`

- **Schedule**: Daily at 2 AM UTC (cron: `0 2 * * *`)
- **Manual trigger**: Can be run on-demand via workflow_dispatch
- **Post-run stats**: Queries ingestion status, chunk counts, recent errors
- **Failure notifications**: Creates GitHub issue if ingestion fails

### 4. Documentation
**File**: `RAG_INGESTION_PIPELINE_README.md`

Complete guide covering:
- Architecture diagram
- Database schema details
- Quick start instructions
- Configuration options
- Scheduling strategies (GitHub Actions, pg_cron, Cloud Run)
- Agent integration examples
- Monitoring queries
- Cost estimation
- Troubleshooting
- Maintenance procedures

### 5. Package Updates
**File**: `package.json`

- Added script: `"ingest:web": "tsx scripts/ingestKnowledgeFromWeb.ts"`
- Added dependencies:
  - `@supabase/supabase-js`: Supabase client
  - `openai`: OpenAI API for embeddings
  - `node-fetch@2`: HTTP client
  - `jsdom`: HTML parsing
  - `pdf-parse`: PDF text extraction
  - `js-sha256`: SHA-256 hashing
  - `@types/jsdom`, `@types/pdf-parse`: TypeScript types

## 🚀 How to Use

### Step 1: Apply Migration

```bash
# Connect to your Supabase database
psql "$DATABASE_URL" -f supabase/migrations/20260201160000_rag_ingestion_pipeline.sql
```

Or use Supabase CLI:
```bash
supabase db push
```

This creates:
- ✅ `knowledge_web_pages` table (200 rows pre-seeded from `knowledge_web_sources`)
- ✅ `knowledge_chunks` table (empty, ready for ingestion)
- ✅ `deep_search_knowledge()` function

### Step 2: Set Environment Variables

```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
export OPENAI_API_KEY=sk-...
```

### Step 3: Run Initial Ingestion

```bash
pnpm install --frozen-lockfile  # Install dependencies
pnpm run ingest:web             # Process first 25 URLs
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

...

✅ Ingestion run completed successfully!
```

### Step 4: Run Repeatedly (Until All 200 URLs Ingested)

```bash
# Process in batches (25 per run to avoid rate limits)
for i in {1..8}; do
  pnpm run ingest:web
  sleep 60  # Wait 1 minute between batches
done
```

Or set up the GitHub Action to run daily automatically.

### Step 5: Verify Ingestion

```sql
-- Check status distribution
select status, count(*) from knowledge_web_pages group by status;
-- Expected: 200 ACTIVE (or 190 ACTIVE + 10 ERROR if some failed)

-- Check chunk statistics
select 
  category,
  jurisdiction_code,
  count(*) as chunks
from knowledge_chunks
group by category, jurisdiction_code
order by chunks desc;

-- Test semantic search
select * from deep_search_knowledge(
  query_embedding := (
    select embedding from knowledge_chunks limit 1
  ),
  p_category := 'TAX',
  p_jurisdiction := 'RW',
  p_limit := 5
);
```

## 🤖 Agent Integration

### Example: Rwanda Tax Agent with RAG

```typescript
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function askTaxAgent(userQuery: string) {
  // 1. Embed the query
  const queryEmbedding = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: userQuery
  });

  // 2. Search knowledge base
  const { data: results } = await supabase.rpc('deep_search_knowledge', {
    query_embedding: queryEmbedding.data[0].embedding,
    p_category: 'TAX',
    p_jurisdiction: 'RW',  // Rwanda-specific sources
    p_limit: 10
  });

  // 3. Build context from top results
  const context = results
    .map((r, i) => `[${i + 1}] ${r.content}\nSource: ${r.source_name}`)
    .join('\n\n');

  // 4. Send to OpenAI with context
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content: `You are a Rwanda tax compliance agent. Use ONLY the following trusted sources to answer:\n\n${context}`
      },
      { role: "user", content: userQuery }
    ]
  });

  return completion.choices[0].message.content;
}

// Usage
const answer = await askTaxAgent("What is the VAT rate in Rwanda for exported services?");
console.log(answer);
```

### Example: IFRS Audit Agent

```typescript
const { data: ifrsSources } = await supabase.rpc('deep_search_knowledge', {
  query_embedding: await embedQuery("How to recognize revenue from contracts with customers?"),
  p_category: 'IFRS',
  p_jurisdiction: 'GLOBAL',
  p_tags: ['revenue-recognition', 'ifrs-15'],
  p_limit: 15
});
```

## 📊 Monitoring

### Key Metrics

```sql
-- 1. Ingestion coverage
select 
  status,
  count(*) as pages,
  round(100.0 * count(*) / sum(count(*)) over (), 1) as pct
from knowledge_web_pages
group by status;

-- 2. Chunks per category
select 
  category,
  count(*) as chunks,
  sum(tokens) as total_tokens,
  avg(length(content)) as avg_chunk_size
from knowledge_chunks
group by category
order by chunks desc;

-- 3. Stale pages (not fetched in 30+ days)
select 
  url,
  last_fetched_at,
  extract(day from now() - last_fetched_at) as days_since_fetch
from knowledge_web_pages
where last_fetched_at < now() - interval '30 days'
  and status = 'ACTIVE'
order by last_fetched_at;

-- 4. Recent errors
select 
  url,
  http_status,
  fetch_error,
  last_fetched_at
from knowledge_web_pages
where status = 'ERROR'
order by last_fetched_at desc;
```

## 💰 Cost Estimation

### OpenAI Embeddings
- **Model**: text-embedding-3-large
- **Price**: $0.13 per 1M tokens
- **Initial ingestion**: 200 URLs × 10 chunks × 1000 tokens = 2M tokens = **$0.26**
- **Incremental updates**: Only changed pages (~10% monthly) = **$0.03/month**

### Supabase Storage
- **pgvector index**: ~6 KB per 1536-dim vector
- **Total**: 2000 chunks × 6 KB = **12 MB** (negligible)

## 🔧 Configuration

Edit `scripts/ingestKnowledgeFromWeb.ts`:

```typescript
const MAX_PAGES_PER_RUN = 25;       // Batch size (avoid rate limits)
const CHUNK_CHAR_SIZE = 4000;       // ~1000 tokens per chunk
const MIN_TEXT_LENGTH = 200;        // Skip pages with minimal text
const FETCH_TIMEOUT_MS = 30000;     // HTTP timeout
const EMBEDDING_MODEL = "text-embedding-3-large"; // OpenAI model
```

## 🛠️ Maintenance

### Re-ingest All Sources

```bash
# Clear all hashes to force re-ingestion
psql "$DATABASE_URL" -c "update knowledge_web_pages set sha256_hash = null;"

# Run in batches
for i in {1..8}; do pnpm run ingest:web; sleep 60; done
```

### Add New Source

1. Add to `config/knowledge-web-sources.yaml`
2. Run: `pnpm run sync:knowledge-web-sources`
3. Run: `pnpm run ingest:web`

### Clean Up Inactive Sources

```sql
delete from knowledge_chunks 
where source_id in (
  select id from knowledge_web_sources where status = 'INACTIVE'
);
```

## ✅ Success Criteria

- ✅ **Database schema**: Tables created with proper indexes and RLS
- ✅ **Ingestion worker**: Fetches, chunks, embeds, stores content
- ✅ **GitHub Action**: Scheduled daily runs with monitoring
- ✅ **Documentation**: Complete README with examples
- ✅ **Agent integration**: `deep_search_knowledge()` RPC ready to use

## 🎯 Next Steps

1. **Apply migration**: Run `20260201160000_rag_ingestion_pipeline.sql`
2. **Test ingestion**: Run `pnpm run ingest:web` locally
3. **Enable GitHub Action**: Add secrets (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY)
4. **Integrate into agents**: Use `deep_search_knowledge()` in agent prompts
5. **Monitor**: Check ingestion stats daily via GitHub Action output
6. **Tune**: Adjust chunk size, embedding model, filters based on results

## 🔗 Related Systems

- **Knowledge Web Sources**: 200 URLs seeded from YAML (IFRS, ISA, RRA, BNR, etc.)
- **Agent Learning**: Agent feedback loop for improving classifications
- **Auto-Classification**: Learns from agent-provided ground truth
- **Accounting KB**: Domain-specific knowledge base for GL, accounts, tax codes

---

**Status**: ✅ Ready to deploy  
**Estimated Setup Time**: 30 minutes  
**Maintenance**: Fully automated via GitHub Actions
