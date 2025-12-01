# Accounting Knowledge Base System

## Overview

The Accounting Knowledge Base is a RAG-powered system that provides grounded, authoritative answers to accounting, auditing, and tax questions based on IFRS, IAS, ISA, GAAP, and local tax laws.

## Architecture

```
┌─────────────────┐
│  AccountantAI   │  (Front-line agent, talks to users)
└────────┬────────┘
         │ calls
         ▼
┌─────────────────┐
│   DeepSearch    │  (Retrieval agent, searches knowledge base)
└────────┬────────┘
         │ queries
         ▼
┌─────────────────────────────────────────┐
│      Supabase Knowledge Base            │
│  ┌────────────┬──────────────────────┐  │
│  │ Documents  │  Chunks + Embeddings │  │
│  │ (IFRS/IAS) │  (Vector search)     │  │
│  └────────────┴──────────────────────┘  │
└─────────────────────────────────────────┘
```

## Components

### 1. Database Schema (`supabase/migrations/20251201_accounting_knowledge_base.sql`)

Core tables:
- **jurisdictions** - Geographic/regulatory jurisdictions (RW, EU, US, GLOBAL)
- **knowledge_sources** - Authoritative sources (IFRS Foundation, RRA, ACCA)
- **knowledge_documents** - Individual standards/laws (IAS 21, IFRS 15, Rwanda VAT Act)
- **knowledge_chunks** - Text chunks for RAG (1500 chars, 200 char overlap)
- **knowledge_embeddings** - Vector embeddings (1536-dim, text-embedding-3-large)
- **ingestion_jobs** & **ingestion_files** - Pipeline tracking
- **agent_queries_log** - Audit trail

### 2. Ingestion Pipeline (`config/accounting-knowledge-pipeline.yaml`)

YAML specification for the knowledge ingestion workflow:
1. Discover sources (IFRS, IAS, tax laws, ACCA, etc.)
2. Download PDFs
3. Parse and chunk text
4. Generate embeddings
5. Store in Supabase

### 3. DeepSearch Agent (`agent/definitions/deepsearch.yaml`)

Retrieval agent that:
- Performs semantic search over knowledge base
- Filters by jurisdiction, authority level, document type
- Handles freshness checking and conflict resolution
- Maintains audit trail

**Key policies:**
- Min relevance score: 0.75 (0.78 for primary standards)
- Max 6 chunks per query
- Authority order: PRIMARY > INTERNAL > SECONDARY
- Check external sources if KB data older than 180 days

### 4. AccountantAI Agent (`agent/definitions/accountant-ai.yaml`)

User-facing agent that:
- Calls DeepSearch for knowledge retrieval
- Provides professional accounting/tax guidance
- Generates journal entries and worked examples
- Cites standards with paragraph-level precision

**Workflows:**
- Financial reporting treatment
- Tax computation
- Audit procedure design
- Disclosure requirements

### 5. Retrieval Rules (`config/retrieval-rules.yaml`)

Ranking and selection logic:
- Base metric: cosine similarity
- Authority weights: PRIMARY (1.0), INTERNAL (0.9), SECONDARY (0.7)
- Recency decay: 365-day half-life
- Jurisdiction matching: +15% bonus for exact match

### 6. Ingestion Script (`scripts/accounting-kb-ingest.ts`)

TypeScript implementation of the ingestion pipeline:
- Downloads PDFs from IFRS, RRA, ACCA, etc.
- Chunks text (1500 chars, 200 overlap)
- Generates embeddings via OpenAI
- Stores in Supabase

## Setup

### Prerequisites

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Environment variables
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-api-key
```

### 1. Apply Database Migration

```bash
# Apply to Supabase
psql "$DATABASE_URL" -f supabase/migrations/20251201_accounting_knowledge_base.sql

# Or via Supabase CLI
supabase db push
```

### 2. Run Ingestion

```bash
# Run the ingestion script
pnpm tsx scripts/accounting-kb-ingest.ts
```

### 3. Verify Data

```sql
-- Check jurisdictions
SELECT * FROM jurisdictions;

-- Check knowledge sources
SELECT * FROM knowledge_sources;

-- Check documents
SELECT id, title, code, status FROM knowledge_documents;

-- Check chunk count
SELECT document_id, COUNT(*) as chunks
FROM knowledge_chunks
GROUP BY document_id;

-- Check embeddings
SELECT COUNT(*) FROM knowledge_embeddings;

-- Test vector search
SELECT 
  kc.content,
  1 - (ke.embedding <=> '[your-query-vector]'::vector) as similarity
FROM knowledge_embeddings ke
JOIN knowledge_chunks kc ON kc.id = ke.chunk_id
ORDER BY ke.embedding <=> '[your-query-vector]'::vector
LIMIT 5;
```

## Usage

### Query from AccountantAI

```typescript
// Example: Ask about revenue recognition
const response = await accountantAI.query({
  question: "How do I recognize revenue from a 3-year software subscription?",
  jurisdiction: "RW",
  context: {
    entity_type: "SME",
    reporting_framework: "IFRS"
  }
});

// Response will include:
// - Summary of IFRS 15 treatment
// - Citations (e.g., IFRS 15.9, IFRS 15.31)
// - Journal entry example
// - Disclosure requirements
```

### Direct DeepSearch Query

```typescript
// Example: Search for specific standard
const results = await deepSearch.search({
  query: "foreign currency transaction initial recognition",
  jurisdiction_code: "GLOBAL",
  types: ["IFRS", "IAS"],
  authority_levels: ["PRIMARY"],
  top_k: 5
});

// Returns ranked chunks with citations
```

## Maintenance

### Adding New Sources

1. Update `SOURCES` array in `scripts/accounting-kb-ingest.ts`
2. Run ingestion: `pnpm tsx scripts/accounting-kb-ingest.ts`

### Updating Existing Documents

```typescript
// Mark old document as deprecated
await supabase
  .from('knowledge_documents')
  .update({ status: 'DEPRECATED', effective_to: '2024-12-31' })
  .eq('code', 'IAS 21')
  .eq('version', '2023');

// Ingest new version
// (ingestion script will create new document)
```

### Monitoring Query Quality

```sql
-- Query performance
SELECT 
  agent_name,
  AVG(latency_ms) as avg_latency,
  COUNT(*) as query_count
FROM agent_queries_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY agent_name;

-- Popular queries
SELECT 
  query_text,
  COUNT(*) as frequency
FROM agent_queries_log
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY query_text
ORDER BY frequency DESC
LIMIT 20;

-- Failed retrievals (no chunks found)
SELECT *
FROM agent_queries_log
WHERE top_chunk_ids IS NULL OR array_length(top_chunk_ids, 1) = 0;
```

## Configuration

### Chunk Size Tuning

Default: 1500 chars, 200 overlap

Adjust in `scripts/accounting-kb-ingest.ts`:
```typescript
const rawChunks = chunkText(fullText, 2000, 300); // larger chunks
```

### Embedding Model

Current: `text-embedding-3-large` (1536 dimensions)

To change model:
1. Update `scripts/accounting-kb-ingest.ts`
2. Update vector dimension in migration SQL
3. Re-create `knowledge_embeddings` table
4. Re-run ingestion

### Retrieval Thresholds

Edit `config/retrieval-rules.yaml`:
```yaml
thresholds:
  min_score_for_use: 0.70  # Lower = more results, less precision
  max_chunks: 10           # More chunks = more context, slower
```

## Troubleshooting

### No Results Returned

1. Check embedding dimension matches model
2. Lower `min_score_for_use` threshold
3. Verify chunks were created: `SELECT COUNT(*) FROM knowledge_chunks`
4. Verify embeddings exist: `SELECT COUNT(*) FROM knowledge_embeddings`

### Slow Queries

1. Check IVFFlat index exists: `\d knowledge_embeddings`
2. Adjust lists parameter: `ALTER INDEX idx_embeddings_vector SET (lists = 200)`
3. Increase `work_mem` in PostgreSQL
4. Use pre-filtering by jurisdiction/type

### Hallucinations

1. Increase `min_score_for_use` threshold
2. Require citations: enforce `minimum_citations: 2`
3. Review agent_queries_log for low-confidence queries
4. Add more primary sources to knowledge base

## Next Steps

1. **Add More Sources**: Expand coverage (IPSAS, national GAAP, industry guides)
2. **Improve Chunking**: Use semantic chunking (respect headings/paragraphs)
3. **Add Hybrid Search**: Combine vector + keyword (full-text search)
4. **Build Feedback Loop**: Track user ratings, improve ranking
5. **Automate Updates**: Schedule periodic checks for new standards/amendments
6. **Multi-language Support**: Add French/Kinyarwanda versions for Rwanda
7. **Fine-tune Embeddings**: Train custom embedding model on accounting text

## References

- [IFRS Standards](https://www.ifrs.org/issued-standards/)
- [Rwanda Revenue Authority](https://www.rra.gov.rw)
- [IAASB - ISA Standards](https://www.iaasb.org)
- [ACCA Technical Resources](https://www.accaglobal.com/technical)
- [Supabase Vector Docs](https://supabase.com/docs/guides/ai/vector-indexes)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
