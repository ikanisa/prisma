# Accounting KB - Quick Reference Card

## 🚀 1-Minute Deploy

```bash
# 1. Apply migrations
psql "$DATABASE_URL" -f supabase/migrations/20251201000000_accounting_kb_comprehensive.sql
psql "$DATABASE_URL" -f supabase/migrations/20251201000001_accounting_kb_functions.sql

# 2. Set environment
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export OPENAI_API_KEY="sk-your-openai-key"

# 3. Run ingestion
pnpm tsx scripts/knowledge/ingest-accounting.ts

# 4. Test search
psql "$DATABASE_URL" -c "SELECT count(*) FROM knowledge_chunks;"
```

## 📁 File Map

| File | Purpose |
|------|---------|
| `supabase/migrations/20251201000000_accounting_kb_comprehensive.sql` | Schema (9 tables) |
| `supabase/migrations/20251201000001_accounting_kb_functions.sql` | SQL functions (5) |
| `config/ingest-pipeline.yaml` | Pipeline spec |
| `config/agents/deepsearch.yaml` | DeepSearch agent |
| `config/agents/accountant-ai.yaml` | AccountantAI persona |
| `config/retrieval-rules.yaml` | Ranking & rules |
| `scripts/knowledge/ingest-accounting.ts` | Ingestion script |

## 🔍 Quick Search

```typescript
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function search(query: string) {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  
  const { data } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding: res.data[0].embedding,
    match_count: 6,
    filter: { jurisdiction_code: 'GLOBAL', types: ['IAS', 'IFRS'] }
  });
  
  return data;
}
```

## 📊 Key Tables

- **jurisdictions** - RW, US, EU, GLOBAL
- **knowledge_sources** - IFRS Foundation, RRA, ACCA
- **knowledge_documents** - IAS 21, IFRS 15, Rwanda Income Tax Act
- **knowledge_chunks** - 1500-char text units
- **knowledge_embeddings** - 1536-dim vectors
- **agent_queries_log** - Audit trail

## 🎯 Ranking Formula

```
final_score = 0.50 * embedding_score
            + 0.25 * authority_weight
            + 0.15 * recency_weight
            + 0.10 * jurisdiction_match
```

## 📏 Thresholds

- Min relevance: **0.75**
- Max chunks: **6**
- Min citations: **2**
- Tax law stale: **90 days**
- IFRS stale: **180 days**

## 🔧 Common Queries

```sql
-- Search by keyword
SELECT * FROM search_knowledge_chunks_keyword('IAS 21', 10, '{}'::jsonb);

-- Get context
SELECT * FROM get_context_chunks('chunk-uuid', 1, 1);

-- Log query
SELECT log_agent_query('AccountantAI', 'user-uuid', 'query', 'response', ARRAY['chunk-uuid']);

-- Check ingestion
SELECT * FROM get_ingestion_stats();

-- Find stale docs
SELECT title, effective_from FROM knowledge_documents kd
JOIN knowledge_sources ks ON kd.source_id = ks.id
WHERE ks.type = 'TAX_LAW' AND kd.effective_from < NOW() - INTERVAL '90 days';
```

## ✅ Validation

```bash
# Check schema
psql "$DATABASE_URL" -c "\dt" | grep knowledge

# Check functions
psql "$DATABASE_URL" -c "\df match_knowledge_chunks"

# Check data
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM knowledge_chunks;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM knowledge_embeddings;"
```

## 🎯 Success Criteria

- Primary source usage: **> 60%**
- Low confidence rate: **< 30%**
- Avg relevance: **> 0.80**
- P95 latency: **< 3s**
- Citation coverage: **100%**

## 📞 Quick Help

**Issue**: No results from search
**Fix**: Check `knowledge_embeddings` count, ensure ingestion ran

**Issue**: Slow search
**Fix**: Rebuild IVFFlat index, adjust `lists` parameter

**Issue**: Low confidence responses
**Fix**: Ingest more PRIMARY sources, refresh stale documents

**Issue**: Agent not citing sources
**Fix**: Check retrieval rules, ensure min_citations = 2

## 🚀 Deploy Checklist

- [ ] Migrations applied
- [ ] Environment configured
- [ ] Dependencies installed (`@supabase/supabase-js`, `openai`, `pdf-parse`)
- [ ] PDFs downloaded to /tmp/
- [ ] Ingestion script run
- [ ] Search tested
- [ ] Monitoring queries saved

**Ready!** 🎉
