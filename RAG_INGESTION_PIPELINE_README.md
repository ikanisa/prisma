# RAG Ingestion Pipeline - Knowledge Web Sources

## Overview

This RAG (Retrieval-Augmented Generation) ingestion pipeline automatically fetches, chunks, embeds, and indexes content from 200+ trusted knowledge sources (IFRS, ISA, ACCA, tax authorities, Big4 resources) to power AI agents with accurate, standards-compliant knowledge.

## Architecture

```
knowledge_web_sources (registry of 200 URLs)
         ↓
knowledge_web_pages (content tracking + hash)
         ↓
    fetch → extract → chunk → embed
         ↓
knowledge_chunks (vector store with pgvector)
         ↓
deep_search_knowledge() → AI agents
```

## Database Schema

### 1. `knowledge_web_pages`
Tracks ingested content from each URL:
- **SHA-256 hash** for change detection (only re-ingest if content changes)
- HTTP status, content type, fetch errors
- Last fetched timestamp
- Status: ACTIVE, INACTIVE, ERROR

### 2. `knowledge_chunks`
Vector store for RAG search:
- Text chunks (~4000 characters each)
- 1536-dimensional embeddings (OpenAI text-embedding-3-large)
- Category and jurisdiction filters (TAX, AUDIT, ACCOUNTING, etc.)
- pgvector with IVFFlat index for fast similarity search

### 3. `deep_search_knowledge()` RPC
Postgres function for semantic search:
```sql
select * from deep_search_knowledge(
  query_embedding := <1536-dim vector>,
  p_category := 'TAX',
  p_jurisdiction := 'RW',
  p_limit := 20
);
```

## Ingestion Worker

### Quick Start

```bash
# 1. Set environment variables
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
export OPENAI_API_KEY=sk-...

# 2. Run migration to create tables
psql "$DATABASE_URL" -f supabase/migrations/20260201160000_rag_ingestion_pipeline.sql

# 3. Run ingestion worker
pnpm run ingest:web
```

### What It Does

1. **Fetch**: Downloads HTML/PDF from up to 25 URLs per run
2. **Extract**: Parses HTML (jsdom) or PDF (pdf-parse) to plain text
3. **Chunk**: Splits text into ~4000 character chunks (semantic boundaries)
4. **Embed**: Generates 1536-dim vectors via OpenAI text-embedding-3-large
5. **Store**: Inserts chunks into `knowledge_chunks` with pgvector index
6. **Update**: Records last_fetched_at, SHA-256 hash, status

### Configuration

Edit `scripts/ingestKnowledgeFromWeb.ts`:

```typescript
const MAX_PAGES_PER_RUN = 25;       // Process max 25 URLs per run
const CHUNK_CHAR_SIZE = 4000;       // ~1000 tokens per chunk
const MIN_TEXT_LENGTH = 200;        // Skip pages with <200 chars
const FETCH_TIMEOUT_MS = 30000;     // 30 second timeout
const EMBEDDING_MODEL = "text-embedding-3-large"; // OpenAI model
```

### Scheduling

**Option 1: GitHub Actions**
```yaml
# .github/workflows/rag-ingest.yml
name: RAG Ingestion
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:

jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm run ingest:web
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

**Option 2: Supabase Edge Function + pg_cron**
```sql
-- Schedule via pg_cron extension
select cron.schedule(
  'rag-ingestion',
  '0 2 * * *',  -- Daily at 2 AM
  $$select net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/ingest-knowledge',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'
  )$$
);
```

**Option 3: Cloud Run + Cloud Scheduler**
Deploy as a Cloud Run job triggered by Cloud Scheduler.

## Agent Integration

### Example: Rwanda Tax Agent

```typescript
// Agent queries knowledge base for tax guidance
const queryEmbedding = await openai.embeddings.create({
  model: "text-embedding-3-large",
  input: userQuery
});

const { data: results } = await supabase.rpc('deep_search_knowledge', {
  query_embedding: queryEmbedding.data[0].embedding,
  p_category: 'TAX',
  p_jurisdiction: 'RW',  // Rwanda-specific
  p_limit: 20
});

// Use results in agent context
const context = results.map(r => r.content).join('\n\n');
const completion = await openai.chat.completions.create({
  model: "gpt-4-turbo",
  messages: [
    { role: "system", content: `You are a Rwanda tax agent. Use this context: ${context}` },
    { role: "user", content: userQuery }
  ]
});
```

### Example: IFRS Audit Agent

```typescript
const { data: ifrsSources } = await supabase.rpc('deep_search_knowledge', {
  query_embedding: queryVector,
  p_category: 'IFRS',
  p_jurisdiction: 'GLOBAL',
  p_tags: ['consolidation', 'revenue-recognition'],
  p_limit: 15
});
```

## Monitoring

### Check ingestion status:

```sql
-- Pages by status
select status, count(*) from knowledge_web_pages group by status;

-- Recent errors
select url, fetch_error, last_fetched_at 
from knowledge_web_pages 
where status = 'ERROR' 
order by last_fetched_at desc 
limit 10;

-- Chunk statistics
select 
  category,
  jurisdiction_code,
  count(*) as chunks,
  sum(length(content)) as total_chars
from knowledge_chunks
group by category, jurisdiction_code
order by chunks desc;

-- Stale pages (not fetched in 30 days)
select url, last_fetched_at 
from knowledge_web_pages 
where last_fetched_at < now() - interval '30 days'
  and status = 'ACTIVE';
```

### Logs:

```bash
pnpm run ingest:web 2>&1 | tee ingestion.log
```

Output:
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

## Cost Estimation

### OpenAI Embeddings (text-embedding-3-large)
- **Price**: $0.13 per 1M tokens
- **Example**: 200 URLs × 10 chunks × 1000 tokens = 2M tokens = **$0.26 per full ingest**
- **Incremental**: Only changed pages are re-ingested (hash-based detection)

### Supabase Storage
- **pgvector index**: ~6 KB per 1536-dim vector
- **Example**: 2000 chunks × 6 KB = **12 MB total**

## Troubleshooting

### Missing Dependencies
```bash
pnpm install --frozen-lockfile
```

### HTTP Errors
- Check `knowledge_web_pages.fetch_error` column
- Some sources may require authentication or rate limiting
- Update `fetchUrlContent()` to add headers/retry logic

### PDF Extraction Fails
```bash
# Ensure pdf-parse is installed
pnpm list pdf-parse
```

### Embedding Dimension Mismatch
```sql
-- Check your vector dimension
select count(*) from knowledge_chunks where array_length(embedding::float[], 1) != 1536;

-- If using different model (e.g., text-embedding-ada-002 = 1536, text-embedding-3-small = 512)
-- Update migration and worker EMBEDDING_MODEL constant
```

### No Results from Deep Search
```sql
-- Check if chunks exist for your filters
select count(*) from knowledge_chunks where category = 'TAX' and jurisdiction_code = 'RW';

-- Check if embeddings are populated
select count(*) from knowledge_chunks where embedding is not null;
```

## Maintenance

### Re-ingest All Sources
```bash
# Mark all pages as stale to force re-ingestion
psql "$DATABASE_URL" -c "update knowledge_web_pages set sha256_hash = null;"

# Run ingestion in batches (25 pages per run)
for i in {1..10}; do pnpm run ingest:web; sleep 60; done
```

### Add New Source
```yaml
# config/knowledge-web-sources.yaml
- url: https://new-source.com/standard
  name: "New Accounting Standard"
  category: ACCOUNTING
  jurisdiction: GLOBAL
  tags: [consolidation]
```

```bash
pnpm run sync:knowledge-web-sources
pnpm run ingest:web
```

### Clean Up Old Chunks
```sql
-- Delete chunks from inactive sources
delete from knowledge_chunks 
where source_id in (
  select id from knowledge_web_sources where status = 'INACTIVE'
);
```

## Security

- **Service Role Key**: Required for ingestion worker (grants full DB access)
- **Authenticated Users**: Can read active pages and chunks (RLS policies)
- **Anon Users**: Can read chunks only (for public knowledge base queries)

## Next Steps

1. ✅ Apply migration: `20260201160000_rag_ingestion_pipeline.sql`
2. ✅ Run initial ingestion: `pnpm run ingest:web`
3. ✅ Set up GitHub Actions for scheduled ingestion
4. ✅ Integrate `deep_search_knowledge()` into agent prompts
5. ✅ Monitor chunk coverage and ingestion errors
6. ✅ Tune chunk size and embedding model as needed

## Related Documentation

- [Knowledge Web Sources Registry](./KNOWLEDGE_WEB_SOURCES_COMPLETE.md)
- [Agent Learning System](./AGENT_LEARNING_COMPLETE.md)
- [Auto-Classification System](./AUTO_CLASSIFICATION_README.md)
