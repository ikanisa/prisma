# Accounting Knowledge Base - Quick Start (5 Minutes)

**Goal**: Get the accounting knowledge base running ASAP.

---

## 1. Apply Database Schema (30 seconds)

```bash
# Option A: Supabase CLI
supabase db reset
supabase db push

# Option B: Direct psql
psql "$DATABASE_URL" -f supabase/migrations/20251201_accounting_kb.sql
```

**Result**: 9 tables created with pgvector enabled.

---

## 2. Set Environment Variables (30 seconds)

```bash
# .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...your-key
OPENAI_API_KEY=sk-your-openai-key
```

---

## 3. Install Dependencies (1 minute)

```bash
pnpm install pdf-parse openai @supabase/supabase-js
```

---

## 4. Download Sample PDFs (2 minutes)

Manually download these into `/tmp/`:
- IAS 21 (Foreign Exchange): https://www.ifrs.org/issued-standards/list-of-standards/ias-21/
- IFRS 15 (Revenue): https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15/

Or use placeholder text for testing.

---

## 5. Run Ingestion (1 minute)

```bash
pnpm tsx scripts/accounting-kb/ingest.ts
```

**Expected Output**:
```
🚀 Accounting Knowledge Base Ingestion
=====================================

📚 Ingesting: IFRS Foundation - IAS 21
📄 Parsed 45 pages, 32,450 chars
✓ Created document: abc-123...
✂️  Created 22 chunks
✓ Inserted 22 chunks
🔢 Embedding batch 1/1...
✅ Done: IFRS Foundation - IAS 21
```

---

## 6. Verify Ingestion (30 seconds)

```bash
psql "$DATABASE_URL" << 'SQL'
SELECT 
  ks.name as source,
  COUNT(kc.id) as chunks,
  COUNT(ke.id) as embeddings
FROM knowledge_sources ks
LEFT JOIN knowledge_documents kd ON kd.source_id = ks.id
LEFT JOIN knowledge_chunks kc ON kc.document_id = kd.id
LEFT JOIN knowledge_embeddings ke ON ke.chunk_id = kc.id
GROUP BY ks.name;
SQL
```

**Expected**:
```
         source         | chunks | embeddings
------------------------+--------+------------
 IFRS Foundation - IAS 21 |     22 |         22
 IFRS Foundation - IFRS 15|     18 |         18
```

---

## 7. Test Semantic Search (30 seconds)

```sql
-- First, embed a test query (use OpenAI API or stub)
-- Then search:
SELECT 
    kc.content,
    kd.code,
    1 - (ke.embedding <=> '[...]'::vector) as similarity
FROM knowledge_embeddings ke
JOIN knowledge_chunks kc ON kc.id = ke.chunk_id
JOIN knowledge_documents kd ON kd.id = kc.document_id
ORDER BY ke.embedding <=> '[...]'::vector
LIMIT 5;
```

---

## Next Steps

✅ **You're done!** You now have:
- PostgreSQL schema with pgvector
- Sample accounting standards ingested
- Embeddings ready for semantic search

**Continue with**:
- `docs/accounting-kb/README.md` - Full guide
- `ACCOUNTING_KB_HANDOFF_COMPLETE.md` - Complete handoff
- `config/agents/accountant-ai.yaml` - Agent setup

---

## Troubleshooting

**Problem**: pgvector extension missing  
**Fix**: `CREATE EXTENSION vector;` in psql

**Problem**: OpenAI rate limit  
**Fix**: Reduce batch size in `ingest.ts` from 50 to 20

**Problem**: PDF download fails  
**Fix**: Download manually and place in `/tmp/`

---

**Total time**: ~5 minutes  
**Ready for production**: See `ACCOUNTING_KB_HANDOFF_COMPLETE.md`
