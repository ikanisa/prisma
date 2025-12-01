# Accounting Knowledge Base - Quick Start

## 1. Apply Database Schema

```bash
# Option A: Direct psql
psql "$DATABASE_URL" -f supabase/migrations/20260201150000_accounting_kb_comprehensive.sql

# Option B: Supabase CLI
supabase db push
```

## 2. Install Dependencies

```bash
pnpm add @supabase/supabase-js openai pdf-parse
pnpm add -D @types/pdf-parse
```

## 3. Configure Environment

Add to `.env.local`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
```

## 4. Download Sample Documents

```bash
# Create download directory
mkdir -p /tmp/accounting-kb

# Download PDFs manually to /tmp/
# Example filenames:
#   /tmp/IFRS_Foundation_-_IAS_21.pdf
#   /tmp/IFRS_Foundation_-_IFRS_15.pdf
#   /tmp/Rwanda_Income_Tax_Act_2023.pdf
```

## 5. Run Ingestion

```bash
# Make executable
chmod +x scripts/accounting-kb/ingest.ts

# Run with tsx
npx tsx scripts/accounting-kb/ingest.ts

# Or with Node + ts-node
node --loader ts-node/esm scripts/accounting-kb/ingest.ts
```

## 6. Verify Data

```sql
-- Check jurisdictions
SELECT * FROM jurisdictions;

-- Check sources
SELECT name, type, authority_level FROM knowledge_sources;

-- Check documents
SELECT title, code, status FROM knowledge_documents;

-- Check chunk count
SELECT 
  kd.title,
  COUNT(kc.id) as chunk_count,
  COUNT(ke.id) as embedding_count
FROM knowledge_documents kd
LEFT JOIN knowledge_chunks kc ON kc.document_id = kd.id
LEFT JOIN knowledge_embeddings ke ON ke.chunk_id = kc.id
GROUP BY kd.id, kd.title;
```

## 7. Test Semantic Search

```sql
-- Search for foreign exchange guidance
WITH query_embedding AS (
  -- In practice, generate this via OpenAI API
  SELECT embedding FROM knowledge_embeddings LIMIT 1
)
SELECT 
  kc.content,
  kd.title,
  kd.code,
  ks.authority_level,
  1 - (ke.embedding <=> qe.embedding) as similarity
FROM knowledge_embeddings ke
JOIN knowledge_chunks kc ON kc.id = ke.chunk_id
JOIN knowledge_documents kd ON kd.id = kc.document_id
JOIN knowledge_sources ks ON ks.id = kd.source_id
CROSS JOIN query_embedding qe
ORDER BY ke.embedding <=> qe.embedding
LIMIT 10;
```

## Next Steps

- Add more sources to `scripts/accounting-kb/ingest.ts`
- Integrate with agent workflows (see `config/agents/`)
- Set up automated ingestion pipeline
- Implement semantic search endpoints
- Configure agent query logging

## Troubleshooting

**Embedding dimension mismatch:**
```sql
-- Check current dimension
SELECT vector_dims(embedding) FROM knowledge_embeddings LIMIT 1;

-- If using different model (e.g., 3072 for text-embedding-3-large with increased dims):
ALTER TABLE knowledge_embeddings 
  ALTER COLUMN embedding TYPE vector(3072);

-- Rebuild index
DROP INDEX idx_embeddings_vector;
CREATE INDEX idx_embeddings_vector
  ON knowledge_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

**PDF parsing errors:**
```bash
# Install additional PDF dependencies
pnpm add pdf-lib canvas
```

**Out of memory during embedding:**
```typescript
// Reduce batch size in ingest.ts
const batchSize = 20; // instead of 50
```

## Files Created

- `supabase/migrations/20260201150000_accounting_kb_comprehensive.sql` - Database schema
- `config/accounting-kb-pipeline.yaml` - Pipeline specification
- `config/agents/deepsearch.yaml` - Retrieval agent (already exists)
- `config/agents/accountant-ai.yaml` - User-facing agent (already exists)
- `config/retrieval-rules.yaml` - Ranking and citation rules (already exists)
- `scripts/accounting-kb/ingest.ts` - Ingestion script
- `docs/ACCOUNTING_KB_COMPREHENSIVE_GUIDE.md` - Full documentation
