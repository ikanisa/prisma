# RAG Ingestion Pipeline - Complete Index

**Status**: ✅ **PRODUCTION READY**  
**Last Updated**: 2025-12-01  
**Version**: 1.0.0

---

## 📁 File Structure

### Core Implementation

| File | Description | Lines |
|------|-------------|-------|
| `supabase/migrations/20260201160000_rag_ingestion_pipeline.sql` | Database schema: tables, indexes, RLS, RPC functions | 250 |
| `scripts/ingestKnowledgeFromWeb.ts` | TypeScript worker: fetch → chunk → embed → store | 380 |
| `.github/workflows/rag-ingestion.yml` | GitHub Action: scheduled daily runs + monitoring | 95 |
| `scripts/verify-rag-setup.sh` | Setup verification script | 75 |

### Documentation

| File | Purpose | Audience |
|------|---------|----------|
| `RAG_INGESTION_PIPELINE_QUICKSTART.md` | 5-minute setup guide | Developers (first-time setup) |
| `RAG_INGESTION_PIPELINE_README.md` | Complete technical documentation | Developers/DevOps |
| `RAG_INGESTION_PIPELINE_SUMMARY.md` | Implementation summary with examples | Tech leads/PMs |
| `RAG_INGESTION_PIPELINE_INDEX.md` | This file - navigation hub | All roles |

### Configuration

| File | Change | Purpose |
|------|--------|---------|
| `package.json` | Added `ingest:web` script + 7 dependencies | Run worker via `pnpm run ingest:web` |

---

## 🎯 Quick Navigation

### I want to...

**Set up the system for the first time**  
→ Start here: [`RAG_INGESTION_PIPELINE_QUICKSTART.md`](./RAG_INGESTION_PIPELINE_QUICKSTART.md)

**Understand the architecture**  
→ Read: [`RAG_INGESTION_PIPELINE_README.md`](./RAG_INGESTION_PIPELINE_README.md) - Architecture section

**Run ingestion manually**  
→ Command: `pnpm run ingest:web`  
→ Docs: [`RAG_INGESTION_PIPELINE_QUICKSTART.md`](./RAG_INGESTION_PIPELINE_QUICKSTART.md) - Step 5

**Schedule automated ingestion**  
→ Setup: [`.github/workflows/rag-ingestion.yml`](./.github/workflows/rag-ingestion.yml)  
→ Docs: [`RAG_INGESTION_PIPELINE_README.md`](./RAG_INGESTION_PIPELINE_README.md) - Scheduling section

**Integrate with AI agents**  
→ Code examples: [`RAG_INGESTION_PIPELINE_SUMMARY.md`](./RAG_INGESTION_PIPELINE_SUMMARY.md) - Agent Integration  
→ RPC function: `deep_search_knowledge()` in migration file

**Monitor ingestion status**  
→ SQL queries: [`RAG_INGESTION_PIPELINE_README.md`](./RAG_INGESTION_PIPELINE_README.md) - Monitoring section

**Troubleshoot issues**  
→ Guide: [`RAG_INGESTION_PIPELINE_QUICKSTART.md`](./RAG_INGESTION_PIPELINE_QUICKSTART.md) - Troubleshooting section

**Verify setup**  
→ Run: `./scripts/verify-rag-setup.sh`

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Knowledge Web Sources                       │
│                    (200 URLs from YAML)                         │
│   IFRS, ISA, ACCA, RRA, BNR, OECD, Big4, Tax Authorities       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Ingestion Worker (TypeScript)                  │
│  • Fetch HTML/PDF     • Extract text      • Chunk (~4000 chars) │
│  • Generate embeddings (OpenAI)           • Store in Supabase   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase PostgreSQL                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ knowledge_web_pages                                       │ │
│  │ • URL tracking  • SHA-256 hash  • Status  • Errors       │ │
│  └────────────────────────┬──────────────────────────────────┘ │
│                           │                                     │
│  ┌────────────────────────┴──────────────────────────────────┐ │
│  │ knowledge_chunks (pgvector)                               │ │
│  │ • Text chunks  • 1536-dim embeddings  • Category/juris   │ │
│  │ • IVFFlat index for fast similarity search               │ │
│  └────────────────────────┬──────────────────────────────────┘ │
│                           │                                     │
│  ┌────────────────────────┴──────────────────────────────────┐ │
│  │ deep_search_knowledge(query_embedding, filters)           │ │
│  │ • Semantic search  • Category/jurisdiction filters        │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                       AI Agents                                 │
│  • Rwanda Tax Agent    • IFRS Audit Agent   • ACCA Agent       │
│  • Query embeddings → deep_search → Context → GPT-4 response   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### 1. Ingestion Flow

```
URL → HTTP GET → Raw Content (HTML/PDF)
  → SHA-256 hash (change detection)
  → Text Extraction (jsdom / pdf-parse)
  → Chunking (~4000 chars, sentence boundaries)
  → Embedding (OpenAI text-embedding-3-large)
  → Storage (knowledge_chunks table)
  → Update metadata (knowledge_web_pages)
```

### 2. Query Flow

```
User Query → Embed (OpenAI)
  → deep_search_knowledge(embedding, category, jurisdiction)
  → pgvector cosine similarity search
  → Top N chunks
  → Agent context → GPT-4 completion
```

---

## 📊 Database Schema

### `knowledge_web_pages`
**Purpose**: Track ingested content from each URL

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `source_id` | uuid | FK to knowledge_web_sources |
| `url` | text | URL to fetch |
| `title` | text | Extracted page title |
| `status` | text | ACTIVE / INACTIVE / ERROR |
| `http_status` | int | HTTP response code |
| `content_type` | text | text/html, application/pdf |
| `sha256_hash` | text | Content hash (change detection) |
| `last_fetched_at` | timestamptz | Last ingestion timestamp |
| `fetch_error` | text | Error message if failed |

**Indexes**: source_id, url, status, last_fetched_at

### `knowledge_chunks`
**Purpose**: Vector store for RAG search

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigserial | Primary key |
| `source_id` | uuid | FK to knowledge_web_sources |
| `page_id` | uuid | FK to knowledge_web_pages |
| `chunk_index` | int | 0, 1, 2... ordering within page |
| `content` | text | Chunk text (~4000 chars) |
| `tokens` | int | Token count (optional) |
| `category` | text | TAX, AUDIT, IFRS, etc. |
| `jurisdiction_code` | text | RW, GLOBAL, MT, etc. |
| `tags` | text[] | Tags from source |
| `embedding` | vector(1536) | OpenAI embedding |

**Indexes**: 
- Unique: (page_id, chunk_index)
- Foreign keys: source_id, page_id
- Filters: category, jurisdiction_code
- **Vector index**: IVFFlat (lists=100) for cosine similarity

### `deep_search_knowledge()` RPC
**Signature**:
```sql
deep_search_knowledge(
  query_embedding vector(1536),
  p_category text default null,
  p_jurisdiction text default null,
  p_tags text[] default null,
  p_limit int default 20
)
```

**Returns**: Chunks ordered by similarity with metadata (source name, URL)

---

## 💻 Commands

### Setup

```bash
# Verify setup
./scripts/verify-rag-setup.sh

# Install dependencies
pnpm install --frozen-lockfile

# Apply migration
psql "$DATABASE_URL" -f supabase/migrations/20260201160000_rag_ingestion_pipeline.sql
```

### Ingestion

```bash
# Run once (processes 25 URLs)
pnpm run ingest:web

# Run full batch (all 200 URLs)
for i in {1..8}; do pnpm run ingest:web; sleep 60; done

# Force re-ingestion (clear hashes)
psql "$DATABASE_URL" -c "update knowledge_web_pages set sha256_hash = null;"
```

### Monitoring

```sql
-- Status overview
select status, count(*) from knowledge_web_pages group by status;

-- Chunk statistics
select category, jurisdiction_code, count(*) 
from knowledge_chunks 
group by category, jurisdiction_code;

-- Recent errors
select url, fetch_error, last_fetched_at 
from knowledge_web_pages 
where status = 'ERROR' 
order by last_fetched_at desc limit 10;

-- Stale pages (30+ days)
select url, last_fetched_at 
from knowledge_web_pages 
where last_fetched_at < now() - interval '30 days';
```

---

## 🔑 Environment Variables

| Variable | Required | Purpose | Example |
|----------|----------|---------|---------|
| `SUPABASE_URL` | ✅ | Supabase project URL | `https://abc.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (full access) | `eyJhbGc...` |
| `OPENAI_API_KEY` | ✅ | OpenAI API key for embeddings | `sk-...` |
| `DATABASE_URL` | ⚠️  | Direct Postgres URL (monitoring only) | `postgresql://...` |

---

## 📅 Scheduling Options

### Option 1: GitHub Actions (Recommended)
- **File**: `.github/workflows/rag-ingestion.yml`
- **Schedule**: Daily at 2 AM UTC (`cron: '0 2 * * *'`)
- **Setup**: Add secrets to GitHub repo
- **Monitoring**: Action output shows stats + errors

### Option 2: pg_cron (Supabase)
```sql
select cron.schedule('rag-ingestion', '0 2 * * *', $$
  select net.http_post(
    url := 'https://project.supabase.co/functions/v1/ingest-knowledge',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'
  )
$$);
```

### Option 3: Cloud Run + Cloud Scheduler
- Deploy worker as Cloud Run job
- Trigger via Cloud Scheduler

---

## 💰 Costs

### OpenAI Embeddings
- **Model**: text-embedding-3-large
- **Price**: $0.13 per 1M tokens
- **Initial**: 200 URLs × 10 chunks × 1000 tokens = **$0.26**
- **Incremental**: ~10% change monthly = **$0.03/month**

### Supabase Storage
- **Vector size**: 6 KB per 1536-dim vector
- **Total**: 2000 chunks × 6 KB = **12 MB** (negligible)

**Total monthly cost**: ~$0.05-0.10 (mostly OpenAI)

---

## 🧪 Testing

### Integration Test
```typescript
// Test full pipeline
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// 1. Embed query
const { data: [{ embedding }] } = await openai.embeddings.create({
  model: "text-embedding-3-large",
  input: "What is the VAT rate in Rwanda?"
});

// 2. Search
const { data, error } = await supabase.rpc('deep_search_knowledge', {
  query_embedding: embedding,
  p_category: 'TAX',
  p_jurisdiction: 'RW',
  p_limit: 5
});

console.log(data); // Should return Rwanda tax chunks
```

---

## 🛠️ Maintenance Tasks

### Weekly
- Review GitHub Action logs for ingestion errors
- Check stale pages (not fetched in 30+ days)

### Monthly
- Audit chunk distribution across categories
- Review and update source URLs if any are deprecated
- Check for duplicate chunks (rare but possible)

### Quarterly
- Re-ingest all sources to refresh content
- Review embedding model (newer models may be available)
- Analyze search quality (agent feedback)

---

## 🔗 Integration Points

### Related Systems
- **Knowledge Web Sources**: YAML registry → `knowledge_web_sources` table
- **Agent Learning**: Feedback loop → classification improvements
- **Auto-Classification**: Ground truth → auto-categorization
- **Accounting KB**: Domain knowledge → GL/tax mappings

### Agent Consumers
- Rwanda Tax Agent (RW + TAX)
- IFRS Audit Agent (GLOBAL + IFRS)
- ACCA Agent (GLOBAL + ACCA)
- Malta Corporate Agent (MT + CORPORATE)

---

## ✅ Deployment Checklist

- [ ] Migration applied (`knowledge_web_pages`, `knowledge_chunks` exist)
- [ ] Dependencies installed (`pnpm list | grep openai`)
- [ ] Environment variables set in GitHub secrets
- [ ] First ingestion run successful (25+ pages)
- [ ] Verify chunks: `select count(*) from knowledge_chunks;`
- [ ] Test search: `select * from deep_search_knowledge(...);`
- [ ] GitHub Action enabled and scheduled
- [ ] Monitoring queries bookmarked
- [ ] Documentation reviewed by team

---

## 📚 Additional Resources

- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Supabase Vector Search](https://supabase.com/docs/guides/ai/vector-search)
- [GitHub Actions Scheduling](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)

---

**Questions or issues?** Check the troubleshooting section in [`RAG_INGESTION_PIPELINE_QUICKSTART.md`](./RAG_INGESTION_PIPELINE_QUICKSTART.md)
