# Accounting Knowledge Base - Quick Reference

## 🚀 Quick Commands

```bash
# 1. Apply database schema
psql "$DATABASE_URL" -f supabase/migrations/20251201_accounting_knowledge_base.sql

# 2. Run ingestion
pnpm tsx scripts/knowledge-ingest/ingest.ts

# 3. Test query
psql "$DATABASE_URL" -c "SELECT count(*) FROM knowledge_chunks;"
```

## 📁 Files Overview

| File | Purpose |
|------|---------|
| `supabase/migrations/20251201_accounting_knowledge_base.sql` | PostgreSQL schema with pgvector |
| `config/knowledge-ingest-pipeline.yaml` | Pipeline workflow specification |
| `config/retrieval-rules.yaml` | Ranking, citation, conflict resolution rules |
| `agent/definitions/deepsearch-agent.yaml` | DeepSearch RAG agent config |
| `agent/definitions/accountant-ai.yaml` | AccountantAI persona config |
| `scripts/knowledge-ingest/ingest.ts` | TypeScript ingestion script |
| `docs/ACCOUNTING_KNOWLEDGE_BASE_README.md` | Full documentation |

## 🗄️ Database Tables

```
jurisdictions           → RW, EU, US, GLOBAL
knowledge_sources       → IFRS Foundation, RRA, ACCA
knowledge_documents     → IAS 21, IFRS 15, Tax Laws
knowledge_chunks        → 1500-char RAG units
knowledge_embeddings    → 1536-dim vectors
ingestion_jobs          → Pipeline runs
ingestion_files         → File processing status
agent_queries_log       → Audit trail
```

## 🎯 Agent Workflow

```
User Query
    ↓
AccountantAI (parse question)
    ↓
DeepSearch (retrieve knowledge)
    ↓
1. Embed query → vector
2. Search knowledge_embeddings
3. Filter by jurisdiction/type/authority
4. Rank by composite score
5. Apply freshness checks
6. Resolve conflicts
7. Return top 6 chunks with citations
    ↓
AccountantAI (generate response)
    ↓
User receives answer + citations + journal entries
```

## 🔍 Search Query Template

```typescript
// 1. Embed query
const { data: [{ embedding }] } = await openai.embeddings.create({
  model: "text-embedding-3-large",
  input: query,
});

// 2. Semantic search
const { data: chunks } = await supabase.rpc("match_knowledge_chunks", {
  query_embedding: embedding,
  match_threshold: 0.75,
  match_count: 6,
  filter_jurisdiction: "GLOBAL",
  filter_types: ["IAS", "IFRS"],
});
```

## 📊 Ranking Formula

```
final_score = 
  embedding_score × 0.50 +       # Cosine similarity
  authority_weight × 0.25 +      # PRIMARY=1.0, SECONDARY=0.7
  recency_weight × 0.15 +        # Exponential decay
  jurisdiction_match × 0.10       # Exact match bonus
```

## ⚙️ Configuration

```yaml
# Chunking
chunk_max_chars: 1500
chunk_overlap_chars: 200

# Embeddings
embedding_model: "text-embedding-3-large"
embedding_dimension: 1536
batch_size: 50

# Thresholds
min_score_for_use: 0.75
max_chunks_per_response: 6
```

## 🎨 Authority Levels

- **PRIMARY** (1.0) - Official IFRS, IAS, ISA, Tax Laws
- **INTERNAL** (0.9) - Company-specific interpretations
- **SECONDARY** (0.7) - ACCA, CPA commentary

## 🌍 Jurisdiction Codes

- **GLOBAL** - IFRS, IAS, ISA
- **RW** - Rwanda (tax laws, local GAAP)
- **EU** - European Union
- **US** - United States (US GAAP, IRS)
- **UK** - United Kingdom

## 📅 Freshness Policies

| Type | Stale After | Action |
|------|------------|---------|
| TAX_LAW | 90 days | External search |
| IFRS/IAS | 180 days | Check IFRS.org |
| ISA | 365 days | Warn user |
| ACCA/CPA | 365 days | Note date |

## ✅ Quality Gates

**HIGH Confidence**:
- 3+ chunks with score ≥ 0.85
- 2+ PRIMARY sources
- No conflicts

**MEDIUM Confidence**:
- 2+ chunks with score ≥ 0.75
- 1+ PRIMARY source
- Minor gaps

**LOW Confidence**:
- 1-2 chunks with score ≥ 0.70
- Only SECONDARY sources
- Significant gaps

## 🔧 Conflict Resolution

1. **Two PRIMARY sources conflict** → Prefer later effective_from
2. **Jurisdiction vs. global** → Prefer local for tax, note for accounting
3. **PRIMARY vs. SECONDARY** → Always prefer PRIMARY
4. **Different versions** → Use latest or query-specific version

## 📝 Citation Format

```
(IAS 21.28, IFRS Foundation, https://ifrs.org/ias-21)
(Rwanda Income Tax Act 2023, Section 8, RRA, https://rra.gov.rw/...)
```

## 🛠️ Adding New Sources

```typescript
// In scripts/knowledge-ingest/ingest.ts
SOURCES.push({
  name: "Your New Standard",
  type: "IFRS",  // or IAS, ISA, TAX_LAW, ACCA, etc.
  authority_level: "PRIMARY",
  jurisdiction_code: "GLOBAL",
  url: "https://...",
  description: "...",
});
```

## 🔐 Environment Variables

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
```

## 📈 Monitoring Queries

```sql
-- Daily query volume
SELECT agent_name, date(created_at), count(*)
FROM agent_queries_log
WHERE created_at > now() - interval '7 days'
GROUP BY agent_name, date(created_at);

-- Most used chunks
SELECT unnest(top_chunk_ids) as chunk_id, count(*)
FROM agent_queries_log
GROUP BY chunk_id
ORDER BY count DESC
LIMIT 20;

-- Low confidence rate
SELECT 
  count(*) FILTER (WHERE metadata->>'confidence' = 'LOW') * 100.0 / count(*) as pct
FROM agent_queries_log
WHERE created_at > now() - interval '24 hours';
```

## 🚀 Production Checklist

- [ ] pgvector extension enabled
- [ ] Database migration applied
- [ ] Environment variables configured
- [ ] Initial documents ingested
- [ ] Semantic search function created
- [ ] Agent definitions deployed
- [ ] Monitoring dashboards set up
- [ ] RLS policies configured
- [ ] Freshness check cron jobs scheduled
- [ ] Team trained on system

## 🆘 Troubleshooting

**Issue**: No results from semantic search
- Check embedding dimension (must be 1536)
- Verify vector index created
- Lower match_threshold

**Issue**: Low confidence responses
- Add more PRIMARY sources
- Update stale documents
- Improve chunking strategy

**Issue**: Slow queries
- Increase IVFFlat lists parameter
- Add more database indexes
- Cache common queries

## 📚 Key Documents

- Full docs: `docs/ACCOUNTING_KNOWLEDGE_BASE_README.md`
- Pipeline spec: `config/knowledge-ingest-pipeline.yaml`
- Retrieval rules: `config/retrieval-rules.yaml`
- Schema: `supabase/migrations/20251201_accounting_knowledge_base.sql`

---

**Built with**: PostgreSQL + pgvector + Supabase + OpenAI + TypeScript
**Status**: Production Ready ✅
