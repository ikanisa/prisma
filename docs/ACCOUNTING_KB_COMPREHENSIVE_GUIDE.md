# Accounting Knowledge Base - Comprehensive Implementation Guide

## Overview

This system provides a complete RAG (Retrieval-Augmented Generation) infrastructure for accounting and tax knowledge, enabling AI agents to provide grounded, citation-backed responses based on authoritative sources.

## Architecture

### Database Schema

The system uses 9 core tables in Supabase:

1. **jurisdictions** - Geographic/regulatory jurisdictions (RW, EU, US, etc.)
2. **knowledge_sources** - High-level sources (IFRS Foundation, RRA, ACCA)
3. **knowledge_documents** - Individual standards/laws (IAS 21, IFRS 15)
4. **knowledge_chunks** - Text chunks for RAG (1500 chars each)
5. **knowledge_embeddings** - Vector embeddings (pgvector, 1536 dimensions)
6. **ingestion_jobs** - Track pipeline runs
7. **ingestion_files** - Track individual file processing
8. **agent_queries_log** - Audit trail of agent retrievals

### Component Files

```
supabase/migrations/
  └── 20260201150000_accounting_kb_comprehensive.sql

config/
  ├── accounting-kb-pipeline.yaml        # Ingestion pipeline spec
  ├── retrieval-rules.yaml               # Retrieval ranking logic
  └── agents/
      ├── deepsearch.yaml                # RAG retrieval agent
      └── accountant-ai.yaml             # User-facing accountant agent

scripts/accounting-kb/
  └── ingest.ts                          # Node.js ingestion worker
```

## Setup

### 1. Apply Database Migration

```bash
# Apply the schema
psql "$DATABASE_URL" -f supabase/migrations/20260201150000_accounting_kb_comprehensive.sql

# Or via Supabase CLI
supabase db push
```

### 2. Install Dependencies

```bash
# Install required packages
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

### 4. Seed Initial Data

The migration automatically seeds 8 jurisdictions:
- GLOBAL (for IFRS/IAS/ISA)
- RW (Rwanda)
- EU (European Union)
- US (United States)
- UK (United Kingdom)
- KE, UG, TZ (East African Community)

## Ingestion Pipeline

### Running the Ingestion Script

```bash
# Make executable
chmod +x scripts/accounting-kb/ingest.ts

# Run with Node
node --loader ts-node/esm scripts/accounting-kb/ingest.ts
```

### Pipeline Steps

1. **Discover Sources** - Load source configurations
2. **Ensure Jurisdictions** - Upsert jurisdiction records
3. **Ensure Sources** - Upsert knowledge sources
4. **Download Documents** - Fetch PDFs from URLs
5. **Parse Documents** - Extract text from PDFs
6. **Create Documents** - Insert document records
7. **Chunk Documents** - Split into 1500-char chunks with 200-char overlap
8. **Insert Chunks** - Store chunks in database
9. **Embed Chunks** - Generate embeddings via OpenAI
10. **Insert Embeddings** - Store vectors for similarity search

### Adding New Sources

Edit `scripts/accounting-kb/ingest.ts`:

```typescript
const SOURCES: SourceConfig[] = [
  {
    name: "Rwanda VAT Act 2022",
    type: "TAX_LAW",
    authority_level: "PRIMARY",
    jurisdiction_code: "RW",
    url: "https://www.rra.gov.rw/vat-act-2022.pdf",
  },
  // Add more sources...
];
```

## Agent Configuration

### DeepSearch Agent

The retrieval specialist that searches the knowledge base:

**Tools:**
- `supabase_semantic_search` - Vector similarity search
- `supabase_keyword_search` - Fallback text search
- `web_authoritative_search` - External source validation

**Policies:**
- Authority order: PRIMARY → INTERNAL → SECONDARY
- Min relevance score: 0.75
- Max chunks: 6
- Require primary sources for IFRS/IAS/ISA/TAX_LAW

### AccountantAI Agent

User-facing agent that orchestrates DeepSearch:

**Domains:**
- Financial reporting
- Taxation
- Auditing
- Management accounting

**Workflows:**
1. **financial_reporting_treatment** - IFRS/IAS guidance
2. **tax_computation** - Tax calculations with law citations
3. **audit_procedure_design** - ISA-based audit procedures

## Retrieval Rules

### Ranking Algorithm

```yaml
ranking:
  base_metric: cosine_similarity
  fields:
    - embedding_score        # Vector similarity
    - authority_weight       # PRIMARY=1.0, INTERNAL=0.9, SECONDARY=0.7
    - recency_weight         # 365-day half-life decay
    - jurisdiction_match_weight  # +15% exact match, +5% global fallback
```

### Selection Strategy

1. **Group by document** - Prefer multiple chunks from same document
2. **Diversify sources** - Include secondary commentary for explanation

### Fallback Logic

- **No chunks above threshold** → Ask user for context
- **Outdated primary sources** → Trigger external freshness check
- **Conflicting primary sources** → Rank by effective date + jurisdiction

## Usage Examples

### Example 1: Query for IFRS 15 Revenue Recognition

```typescript
// DeepSearch retrieval
const results = await deepsearch.search({
  query: "How should variable consideration be estimated under IFRS 15?",
  jurisdiction_code: "GLOBAL",
  types: ["IFRS"],
  top_k: 6
});

// Results include:
// - IFRS 15.53-58 (Variable consideration)
// - IFRS 15.50-52 (Constraint on estimates)
// - ACCA technical article (secondary commentary)
```

### Example 2: Rwanda Tax Law

```typescript
const results = await deepsearch.search({
  query: "Corporate income tax rate and deductions in Rwanda",
  jurisdiction_code: "RW",
  types: ["TAX_LAW"],
  top_k: 6
});

// Prioritizes Rwanda Income Tax Act over global guidance
```

## Maintenance

### Updating Knowledge

1. **Add new documents** - Run ingest script with updated SOURCES
2. **Deprecate old standards** - Update `status` to 'DEPRECATED'
3. **Version tracking** - Use `version` and `effective_from/to` dates

### Monitoring

Query the audit log:

```sql
SELECT 
  agent_name,
  query_text,
  array_length(top_chunk_ids, 1) as chunks_used,
  latency_ms
FROM agent_queries_log
WHERE created_at > now() - interval '7 days'
ORDER BY created_at DESC;
```

### Performance Tuning

```sql
-- Rebuild vector index with more lists for larger datasets
DROP INDEX idx_embeddings_vector;
CREATE INDEX idx_embeddings_vector
  ON knowledge_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 500);  -- Increase for >1M embeddings
```

## Integration Points

### With Existing Agents

The accounting KB integrates with:

1. **Tax Agents** - Pull RW tax law chunks for computations
2. **Audit Agents** - Retrieve ISA procedures and requirements
3. **Financial Reporting Agents** - IFRS/IAS guidance with citations

### With Chat Interface

```typescript
// In chatkit session
const accountantResponse = await agent.run({
  agent: "AccountantAI",
  message: "How do we account for foreign exchange gains?",
  context: {
    jurisdiction: "RW",
    entity_type: "manufacturing"
  }
});

// Returns structured response with:
// - Grounded answer from IAS 21
// - Citations (document code, section, URL)
// - Jurisdiction clarifications
// - Example journal entries
```

## Security Considerations

1. **RLS Policies** - Add row-level security for multi-tenant deployments
2. **Service Role Key** - Keep SUPABASE_SERVICE_ROLE_KEY secure
3. **Rate Limiting** - Implement on embedding API calls
4. **Audit Trail** - All queries logged in agent_queries_log

## Troubleshooting

### Embeddings Not Matching

- **Check dimension** - Ensure vector(1536) matches model output
- **Rebuild index** - Drop and recreate ivfflat index
- **Verify normalization** - Use cosine_distance, not L2

### Low Relevance Scores

- **Chunk size** - Try 1000-2000 char chunks
- **Overlap** - Increase to 300 chars for better context
- **Section extraction** - Parse document headings into section_path

### Missing Citations

- **Extract codes** - Parse "IAS 21", "IFRS 15" from titles
- **Section paths** - Use regex to extract paragraph numbers
- **Metadata** - Store original URLs in knowledge_documents.metadata

## Next Steps

1. **Expand sources** - Add ISA, US GAAP, OECD guidelines
2. **Web scraping** - Automate downloads from IFRS/ACCA sites
3. **Hybrid search** - Combine vector + full-text for better recall
4. **Auto-updates** - Schedule checks for new standards/amendments
5. **Multi-language** - Add French/Kinyarwanda translations

## References

- **IFRS Foundation**: https://www.ifrs.org
- **IAASB (ISA)**: https://www.iaasb.org
- **ACCA**: https://www.accaglobal.com
- **RRA (Rwanda)**: https://www.rra.gov.rw
- **pgvector**: https://github.com/pgvector/pgvector
