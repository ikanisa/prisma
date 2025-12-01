# Accounting Knowledge Base System

Complete system for ingesting, storing, and retrieving authoritative accounting and tax knowledge using RAG (Retrieval-Augmented Generation).

## Overview

This system provides a grounded knowledge base for AI agents (AccountantAI, DeepSearch) to answer questions about:

- **IFRS** (International Financial Reporting Standards)
- **IAS** (International Accounting Standards)  
- **ISA** (International Standards on Auditing)
- **GAAP** (Generally Accepted Accounting Principles)
- **Tax Laws** (Rwanda, US, EU, etc.)
- **Professional Bodies** (ACCA, CPA, OECD guidance)

## Architecture

### Database Schema

**Core Tables:**
- `jurisdictions` - Geographic/regulatory zones (Rwanda, EU, US, Global)
- `knowledge_sources` - Authoritative bodies (IFRS Foundation, RRA, ACCA)
- `knowledge_documents` - Individual standards/laws (IAS 21, IFRS 15, etc.)
- `knowledge_chunks` - Text chunks for RAG retrieval
- `knowledge_embeddings` - Vector embeddings (pgvector)
- `ingestion_jobs` & `ingestion_files` - Pipeline tracking
- `agent_queries_log` - Audit trail

### Agents

**DeepSearch** - Retrieval agent that:
- Performs semantic search over embeddings
- Filters by jurisdiction, authority level, document type
- Maintains audit trail of retrieved chunks
- Handles freshness checks for tax laws

**AccountantAI** - User-facing agent that:
- Calls DeepSearch to retrieve relevant knowledge
- Provides standard-compliant advice with citations
- Generates journal entries and disclosures
- Distinguishes between IFRS, GAAP, and tax law

## Files

### Database
- `supabase/migrations/20251201_accounting_kb.sql` - Complete schema migration

### Configuration
- `config/accounting-kb-ingest.yaml` - Ingestion pipeline definition
- `config/agents/deepsearch.yaml` - DeepSearch agent specification
- `config/agents/accountant-ai.yaml` - AccountantAI agent specification
- `config/retrieval-rules.yaml` - Retrieval ranking and citation rules

### Scripts
- `scripts/accounting-kb/ingest.ts` - TypeScript ingestion worker

## Quick Start

### 1. Apply Database Migration

```bash
# Using Supabase CLI
supabase db reset  # if dev
supabase db push   # to apply migration

# Or manually via psql
psql "$DATABASE_URL" -f supabase/migrations/20251201_accounting_kb.sql
```

### 2. Configure Environment

```bash
# .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
```

### 3. Run Ingestion

```bash
# Install dependencies first
pnpm install pdf-parse openai @supabase/supabase-js

# Run ingestion script
pnpm tsx scripts/accounting-kb/ingest.ts
```

### 4. Query the Knowledge Base

```sql
-- Semantic search example
SELECT 
    kc.content,
    kc.section_path,
    kd.code,
    ks.name,
    1 - (ke.embedding <=> $1::vector) as similarity
FROM knowledge_embeddings ke
JOIN knowledge_chunks kc ON kc.id = ke.chunk_id
JOIN knowledge_documents kd ON kd.id = kc.document_id
JOIN knowledge_sources ks ON ks.id = kd.source_id
ORDER BY ke.embedding <=> $1::vector
LIMIT 10;
```

## Retrieval Rules

The system uses sophisticated ranking:

1. **Authority weights**: PRIMARY (1.0) > INTERNAL (0.9) > SECONDARY (0.7)
2. **Recency decay**: 365-day half-life for standards
3. **Jurisdiction matching**: +15% bonus for exact match
4. **Minimum score**: 0.75 for general use, 0.78 for standards

## Agent Workflows

### Financial Reporting Treatment

```
User Question → DeepSearch (semantic search) → 
Apply retrieval rules → Rank by authority/relevance → 
Draft answer with citations → Present to user
```

### Tax Computation

```
Extract jurisdiction → DeepSearch for tax law → 
Compute adjustments → Present workings + summary
```

## Customization

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
  // ... more sources
];
```

### Adjusting Chunk Size

Edit `config/accounting-kb-ingest.yaml`:

```yaml
chunk_documents:
  config:
    max_chars: 2000     # Increase for more context
    overlap_chars: 300  # Increase overlap
```

### Changing Embedding Model

Update both:
1. `scripts/accounting-kb/ingest.ts` - model name
2. `supabase/migrations/20251201_accounting_kb.sql` - vector dimension

```sql
-- For text-embedding-3-small (1536 dims)
embedding vector(1536)

-- For text-embedding-3-large (3072 dims)  
embedding vector(3072)
```

## Monitoring

Check ingestion status:

```sql
SELECT * FROM ingestion_jobs ORDER BY created_at DESC LIMIT 10;
SELECT * FROM ingestion_files WHERE status = 'FAILED';
```

Audit agent usage:

```sql
SELECT 
    agent_name,
    COUNT(*) as query_count,
    AVG(latency_ms) as avg_latency_ms
FROM agent_queries_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY agent_name;
```

## Production Considerations

1. **Rate Limiting**: OpenAI embeddings API has rate limits
2. **Batch Processing**: Embed in batches of 50-100 chunks
3. **Vector Index Tuning**: Adjust `lists` parameter based on chunk count
4. **Freshness Checks**: Implement scheduled jobs for tax law updates
5. **Access Control**: Use RLS policies on knowledge tables
6. **Caching**: Cache frequent queries with Redis

## Next Steps

1. Implement HTTP downloader for PDFs
2. Add HTML/web scraping for online standards
3. Build admin UI for managing sources
4. Add OCR for scanned PDFs
5. Implement conflict detection between standards
6. Add multi-language support (French, Kinyarwanda)
7. Build citation formatter for different styles

## Support

See existing documentation:
- `ACCOUNTING_KB_IMPLEMENTATION_COMPLETE.md` - Implementation details
- `START_HERE_ACCOUNTING_KB.md` - Quick start guide
- `ACCOUNTING_KB_INDEX.md` - Full index

## License

Internal use only. Respect copyright of ingested materials.
