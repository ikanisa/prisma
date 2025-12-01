# Accounting Knowledge Base System

Complete RAG (Retrieval-Augmented Generation) infrastructure for grounded, citation-backed accounting and tax guidance.

## 🎯 Purpose

Enable AI agents to provide authoritative answers based on:
- **IFRS/IAS** - International Financial Reporting Standards
- **ISA** - International Standards on Auditing
- **GAAP** - Generally Accepted Accounting Principles
- **Tax Laws** - Jurisdiction-specific tax legislation (Rwanda, EU, US, etc.)
- **Professional Bodies** - ACCA, CPA, OECD guidance

## 🏗️ Architecture

### Database Tables

```
jurisdictions            # RW, EU, US, GLOBAL, etc.
  ↓
knowledge_sources        # IFRS Foundation, RRA, ACCA
  ↓
knowledge_documents      # IAS 21, IFRS 15, Rwanda Income Tax Act
  ↓
knowledge_chunks         # 1500-char text chunks
  ↓
knowledge_embeddings     # Vector embeddings (pgvector)
```

**Supporting tables:**
- `ingestion_jobs` - Track pipeline runs
- `ingestion_files` - Per-file processing status
- `agent_queries_log` - Audit trail of retrievals

### AI Agents

**DeepSearch** (`config/agents/deepsearch.yaml`)
- Semantic search over embeddings
- Keyword fallback search
- External authoritative source validation
- Authority-level ranking (PRIMARY > INTERNAL > SECONDARY)

**AccountantAI** (`config/agents/accountant-ai.yaml`)
- User-facing professional accountant persona
- Orchestrates DeepSearch calls
- Generates journal entries, disclosures, workings
- Provides citations for all assertions

### Retrieval Rules (`config/retrieval-rules.yaml`)

**Composite ranking formula:**
```
final_score = (
  embedding_score * 0.50 +
  authority_weight * 0.25 +
  recency_weight * 0.15 +
  jurisdiction_match_weight * 0.10
)
```

**Quality gates:**
- Min score: 0.75 (0.78 for primary standards)
- Max chunks: 6 per response
- Require primary sources for IFRS/IAS/ISA/TAX_LAW

**Conflict resolution:**
- Prefer later effective dates
- Jurisdiction-specific law > global for tax
- IFRS > local GAAP for financial reporting

## 📁 Files

```
supabase/migrations/
  20260201150000_accounting_kb_comprehensive.sql  # Schema

config/
  accounting-kb-pipeline.yaml                     # Ingestion spec
  retrieval-rules.yaml                            # Ranking logic
  agents/
    deepsearch.yaml                               # RAG retrieval agent
    accountant-ai.yaml                            # User-facing agent

scripts/accounting-kb/
  ingest.ts                                       # Node.js ingestion worker

docs/
  ACCOUNTING_KB_COMPREHENSIVE_GUIDE.md            # Full guide
  ACCOUNTING_KB_QUICKSTART.md                     # Quick start
```

## 🚀 Quick Start

### 1. Setup Database

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260201150000_accounting_kb_comprehensive.sql
```

### 2. Install Dependencies

```bash
pnpm add @supabase/supabase-js openai pdf-parse
pnpm add -D @types/pdf-parse
```

### 3. Configure Environment

```bash
# .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
```

### 4. Run Ingestion

```bash
# Download PDFs to /tmp/ first
npx tsx scripts/accounting-kb/ingest.ts
```

See [`docs/ACCOUNTING_KB_QUICKSTART.md`](../docs/ACCOUNTING_KB_QUICKSTART.md) for detailed setup.

## 📊 Usage Examples

### Financial Reporting Query

```typescript
// DeepSearch retrieves IFRS 15 guidance
const result = await deepsearch.search({
  query: "How to estimate variable consideration?",
  jurisdiction_code: "GLOBAL",
  types: ["IFRS"],
  top_k: 6
});

// Returns:
// - IFRS 15.53-58 (Variable consideration methods)
// - IFRS 15.50-52 (Constraint on estimates)
// - ACCA technical article (commentary)
```

### Tax Computation Query

```typescript
const result = await deepsearch.search({
  query: "Corporate income tax deductions Rwanda",
  jurisdiction_code: "RW",
  types: ["TAX_LAW"],
  top_k: 6
});

// Prioritizes Rwanda Income Tax Act over global guidance
```

### Audit Procedure Design

```typescript
const result = await deepsearch.search({
  query: "Substantive procedures for revenue testing",
  types: ["ISA"],
  top_k: 6
});

// Returns ISA 330, ISA 500, ISA 520 excerpts
```

## 🔧 Maintenance

### Adding New Sources

Edit `scripts/accounting-kb/ingest.ts`:

```typescript
const SOURCES: SourceConfig[] = [
  {
    name: "Rwanda VAT Act 2022",
    type: "TAX_LAW",
    authority_level: "PRIMARY",
    jurisdiction_code: "RW",
    url: "https://www.rra.gov.rw/vat-act.pdf",
  },
  // ...
];
```

### Monitoring Queries

```sql
SELECT 
  agent_name,
  COUNT(*) as query_count,
  AVG(latency_ms) as avg_latency,
  COUNT(DISTINCT user_id) as unique_users
FROM agent_queries_log
WHERE created_at > now() - interval '7 days'
GROUP BY agent_name;
```

### Performance Tuning

```sql
-- Rebuild vector index for larger datasets
DROP INDEX idx_embeddings_vector;
CREATE INDEX idx_embeddings_vector
  ON knowledge_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 500);  -- Increase for >1M embeddings
```

## 🎓 Key Features

✅ **Authority-aware ranking** - Primary sources prioritized  
✅ **Jurisdiction handling** - Cross-border tax/legal clarity  
✅ **Freshness validation** - Triggers external checks for stale docs  
✅ **Conflict resolution** - Smart handling of conflicting sources  
✅ **Citation policy** - Minimum 2 citations per response  
✅ **Audit trail** - All queries logged with chunks used  
✅ **Hybrid search** - Vector + keyword fallback  
✅ **Context preservation** - Groups chunks from same document  

## 🔗 Integration Points

- **Tax Agents** - Pull RW tax law for computations
- **Audit Agents** - Retrieve ISA procedures
- **Financial Reporting Agents** - IFRS/IAS with citations
- **Chat Interface** - AccountantAI persona for users

## 📚 Documentation

- **[Comprehensive Guide](../docs/ACCOUNTING_KB_COMPREHENSIVE_GUIDE.md)** - Full architecture and usage
- **[Quick Start](../docs/ACCOUNTING_KB_QUICKSTART.md)** - 5-minute setup
- **[Pipeline Spec](../config/accounting-kb-pipeline.yaml)** - Ingestion workflow
- **[Retrieval Rules](../config/retrieval-rules.yaml)** - Ranking and citation logic
- **[DeepSearch Agent](../config/agents/deepsearch.yaml)** - RAG retrieval spec
- **[AccountantAI Agent](../config/agents/accountant-ai.yaml)** - User-facing persona

## 🤝 Contributing

When adding new knowledge sources:

1. Add source config to `scripts/accounting-kb/ingest.ts`
2. Download PDFs to `/tmp/`
3. Run ingestion script
4. Test retrieval with sample queries
5. Update documentation

## 📝 License

Part of Prisma Glow workspace - see root LICENSE.

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** 2026-02-01
