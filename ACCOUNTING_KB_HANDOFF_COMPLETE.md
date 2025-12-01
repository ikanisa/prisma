# Accounting Knowledge Base - Complete Handoff Package

**Status**: ✅ Ready for Implementation  
**Created**: 2025-12-01  
**Purpose**: Turnkey system for grounding AI agents in authoritative accounting/tax knowledge

---

## Executive Summary

This package provides everything needed to build a production-grade knowledge base for IFRS, IAS, ISA, GAAP, and tax law retrieval. Use it to eliminate hallucinations in accounting AI agents by grounding all answers in real, citable standards.

**What's Included:**
- Complete PostgreSQL schema with pgvector
- YAML specs for agents and pipelines
- TypeScript ingestion worker
- Comprehensive documentation

**Deployment Time**: 2-4 hours for initial setup + ingestion

---

## Files Delivered

### 1. Database Migration
📁 `supabase/migrations/20251201_accounting_kb.sql`

Complete schema with:
- 9 tables (jurisdictions, sources, documents, chunks, embeddings, jobs, files, logs)
- pgvector extension for semantic search
- Seed data for 5 jurisdictions (GLOBAL, RW, US, EU, UK)
- Full indexes and constraints

**Apply with:**
```bash
psql "$DATABASE_URL" -f supabase/migrations/20251201_accounting_kb.sql
```

---

### 2. Pipeline Configuration
📁 `config/accounting-kb-ingest.yaml`

Declarative pipeline spec for:
- Discovering sources (IFRS, IAS, tax laws)
- Downloading PDFs/HTML
- Parsing and chunking
- Embedding with OpenAI
- Inserting into Supabase

**Use as spec** for building your worker or adapt the TypeScript script.

---

### 3. Agent Definitions

**DeepSearch Agent**  
📁 `config/agents/deepsearch.yaml`

Retrieval-focused agent with:
- Semantic search over embeddings
- Keyword fallback search
- External authoritative search
- Authority-based ranking
- Freshness policies

**AccountantAI Agent**  
📁 `config/agents/accountant-ai.yaml`

User-facing agent with:
- Calls DeepSearch for grounding
- Generates journal entries
- Provides tax computations
- Audit procedure design
- Citation-rich responses

---

### 4. Retrieval Rules
📁 `config/retrieval-rules.yaml`

Sophisticated ranking system:
- Authority weights (PRIMARY: 1.0, SECONDARY: 0.7)
- Recency decay (365-day half-life)
- Jurisdiction matching (+15% bonus)
- Conflict resolution logic
- Citation policies

---

### 5. Ingestion Script
📁 `scripts/accounting-kb/ingest.ts`

TypeScript worker skeleton with:
- Supabase client integration
- PDF parsing (pdf-parse)
- Text chunking (1500 chars, 200 overlap)
- OpenAI embeddings (text-embedding-3-large)
- Batch processing (50 chunks/batch)

**Run with:**
```bash
pnpm tsx scripts/accounting-kb/ingest.ts
```

---

### 6. Documentation

**Main Guide**  
📁 `docs/accounting-kb/README.md`

Covers:
- Architecture overview
- Quick start guide
- Customization instructions
- Monitoring queries
- Production considerations

**Schema Reference**  
📁 `docs/accounting-kb/SCHEMA.md`

Detailed docs on:
- All 9 tables
- Indexes and constraints
- Sample queries
- Data flows
- Performance tuning

---

## Implementation Roadmap

### Phase 1: Setup (1 hour)
1. ✅ Apply database migration
2. ✅ Configure environment variables
3. ✅ Install dependencies (`pnpm install pdf-parse openai`)
4. ✅ Verify pgvector extension

### Phase 2: Initial Ingestion (2-3 hours)
1. Download sample PDFs (IFRS, IAS, tax laws)
2. Update SOURCES array in `ingest.ts`
3. Run ingestion script
4. Verify chunks and embeddings

### Phase 3: Agent Integration (2-4 hours)
1. Implement semantic search endpoint
2. Wire up DeepSearch agent
3. Connect AccountantAI to DeepSearch
4. Test end-to-end query

### Phase 4: Production Hardening (1-2 days)
1. Add RLS policies for multi-tenancy
2. Implement rate limiting
3. Set up monitoring dashboards
4. Schedule freshness checks
5. Build admin UI

---

## Quick Start Commands

```bash
# 1. Apply migration
psql "$DATABASE_URL" -f supabase/migrations/20251201_accounting_kb.sql

# 2. Set environment
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-key"
export OPENAI_API_KEY="sk-your-key"

# 3. Install deps
pnpm install pdf-parse openai @supabase/supabase-js

# 4. Run ingestion
pnpm tsx scripts/accounting-kb/ingest.ts

# 5. Test query
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM knowledge_embeddings;"
```

---

## Architecture Decisions

### Why pgvector?
- Native PostgreSQL extension (no separate vector DB)
- Mature and production-ready
- Good balance of speed/accuracy for <100K chunks
- Seamless Supabase integration

### Why IVFFlat Index?
- Fast approximate nearest neighbor search
- Good for <1M vectors
- Lower memory footprint than HNSW
- Easy to tune (lists parameter)

### Why 1500-char Chunks?
- ~375 tokens (avg 4 chars/token)
- Fits context windows with room for prompt
- Preserves paragraph-level coherence
- 200-char overlap maintains context

### Why Authority Levels?
- Prefer laws/standards over commentary
- Handle conflicting guidance
- Transparent sourcing for users
- Audit trail for compliance

---

## Customization Guide

### Adding a New Jurisdiction

```sql
INSERT INTO jurisdictions (code, name) 
VALUES ('KE', 'Kenya');
```

Then add sources:

```typescript
{
  name: "Kenya Revenue Authority - Income Tax Act",
  type: "TAX_LAW",
  authority_level: "PRIMARY",
  jurisdiction_code: "KE",
  url: "https://kra.go.ke/..."
}
```

### Changing Embedding Model

**From text-embedding-3-large → ada-002:**

1. Update migration:
```sql
-- Change vector dimension 3072 → 1536
embedding vector(1536)
```

2. Update ingest script:
```typescript
model: "text-embedding-ada-002"
```

3. Rebuild index:
```sql
REINDEX INDEX idx_embeddings_vector;
```

### Tuning Retrieval Rules

Edit `config/retrieval-rules.yaml`:

```yaml
authority_weights:
  PRIMARY: 1.0
  INTERNAL: 0.95   # Increase if you trust internal docs more
  SECONDARY: 0.6   # Decrease to de-prioritize commentary

thresholds:
  min_score_for_use: 0.70  # Lower = more recall, higher = more precision
  max_chunks: 8             # More chunks = more context, slower
```

---

## Monitoring Queries

### Check Ingestion Health

```sql
-- Recent jobs
SELECT * FROM ingestion_jobs 
ORDER BY created_at DESC LIMIT 10;

-- Failed files
SELECT uri, error_message 
FROM ingestion_files 
WHERE status = 'FAILED';

-- Chunk counts by source
SELECT ks.name, COUNT(kc.id) as chunk_count
FROM knowledge_sources ks
JOIN knowledge_documents kd ON kd.source_id = ks.id
JOIN knowledge_chunks kc ON kc.document_id = kd.id
GROUP BY ks.name
ORDER BY chunk_count DESC;
```

### Agent Usage Analytics

```sql
-- Top queries
SELECT query_text, COUNT(*) as count
FROM agent_queries_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY query_text
ORDER BY count DESC
LIMIT 20;

-- Agent performance
SELECT 
  agent_name,
  COUNT(*) as query_count,
  AVG(latency_ms) as avg_latency,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency
FROM agent_queries_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY agent_name;
```

---

## Troubleshooting

### Problem: "extension 'vector' does not exist"
**Solution**: Enable pgvector in Supabase dashboard or run:
```sql
CREATE EXTENSION vector;
```

### Problem: Ingestion fails with "rate limit exceeded"
**Solution**: Reduce batch size in `ingest.ts`:
```typescript
const batchSize = 20; // Down from 50
```

### Problem: Search returns no results
**Check**:
1. Are embeddings created? `SELECT COUNT(*) FROM knowledge_embeddings;`
2. Is index built? `\d+ knowledge_embeddings`
3. Is query embedding same dimension as stored embeddings?

### Problem: Slow semantic search
**Solutions**:
1. Increase lists parameter:
```sql
DROP INDEX idx_embeddings_vector;
CREATE INDEX idx_embeddings_vector 
  ON knowledge_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 500);
```
2. Add filters before vector search (jurisdiction, type)
3. Cache frequent queries

---

## Security Checklist

- [ ] Use service role key only in backend (never in browser)
- [ ] Enable RLS on all tables
- [ ] Restrict direct table access via Supabase API
- [ ] Audit agent_queries_log for sensitive queries
- [ ] Rotate API keys regularly
- [ ] Implement rate limiting per user
- [ ] Monitor for prompt injection attempts

---

## Next Steps

### Immediate (Week 1)
1. Apply migration to dev environment
2. Ingest 3-5 sample standards
3. Build basic search endpoint
4. Test with AccountantAI agent

### Short-term (Month 1)
1. Ingest all IFRS/IAS standards
2. Add Rwanda tax laws
3. Build admin UI for source management
4. Implement citation formatter
5. Add conflict detection

### Medium-term (Quarter 1)
1. Multi-language support (French, Kinyarwanda)
2. OCR for scanned PDFs
3. HTML scraping for online standards
4. Automated freshness checks
5. Build benchmark test suite

### Long-term (Year 1)
1. Cross-reference detection between standards
2. Change tracking and version diffing
3. AI-assisted document classification
4. Integration with external legal databases
5. Mobile offline sync

---

## Support & References

**Existing Documentation:**
- `ACCOUNTING_KB_IMPLEMENTATION_COMPLETE.md` - Original implementation
- `START_HERE_ACCOUNTING_KB.md` - Quick start
- `ACCOUNTING_KB_INDEX.md` - Full index

**External Resources:**
- pgvector: https://github.com/pgvector/pgvector
- Supabase Vectors: https://supabase.com/docs/guides/ai/vector-columns
- OpenAI Embeddings: https://platform.openai.com/docs/guides/embeddings

**Team Contacts:**
- System Architect: [Your team lead]
- DBA: [Your DBA]
- AI/ML Engineer: [Your ML engineer]

---

## Success Metrics

**Initial (Week 1):**
- [ ] 100+ chunks ingested
- [ ] <100ms p95 search latency
- [ ] 0 failed ingestion jobs

**Production (Month 1):**
- [ ] 10,000+ chunks ingested
- [ ] 80%+ citation rate in agent responses
- [ ] <5% hallucination rate (human eval)
- [ ] 90%+ user satisfaction on grounded answers

**Scale (Quarter 1):**
- [ ] 50,000+ chunks
- [ ] Multi-jurisdiction support (RW, EU, US)
- [ ] <200ms p95 end-to-end latency
- [ ] 99.9% uptime

---

## License & Legal

**Internal Use Only**

This system ingests copyrighted materials. Ensure you have:
- [ ] Proper licenses for IFRS/IAS/ISA access
- [ ] Compliance with fair use for tax laws
- [ ] Terms of service compliance for ACCA/CPA materials
- [ ] Data retention policies for user queries

Do NOT:
- Redistribute ingested content
- Expose raw embeddings publicly
- Use for commercial resale
- Violate copyright terms

---

## Handoff Checklist

- [x] Database schema created
- [x] Migration file tested
- [x] Pipeline YAML documented
- [x] Agent specs defined
- [x] Retrieval rules configured
- [x] Ingestion script provided
- [x] Documentation complete
- [ ] Demo environment deployed (pending)
- [ ] Team training scheduled (pending)
- [ ] Production deployment plan (pending)

**Handoff Complete**: 2025-12-01  
**Ready for**: Development team, Copilot, Gemini, or any AI assistant

---

**Questions?** See `docs/accounting-kb/README.md` or contact the platform team.

**Ready to start?** Run:
```bash
psql "$DATABASE_URL" -f supabase/migrations/20251201_accounting_kb.sql
pnpm tsx scripts/accounting-kb/ingest.ts
```

🚀 **Let's eliminate hallucinations!**
