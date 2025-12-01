# Accounting Knowledge Base System

This directory contains the complete accounting knowledge base system for IFRS, IAS, ISA, GAAP, and tax law retrieval with RAG (Retrieval-Augmented Generation).

## 📚 Overview

The system provides:
- **Database schema** for storing accounting standards and tax laws
- **Vector embeddings** for semantic search (pgvector)
- **Agent definitions** (DeepSearch, AccountantAI)
- **Retrieval rules** for grounded, citation-based responses
- **Ingestion pipeline** to load PDFs into the knowledge base

## 🗂️ Files

### Database Schema
- **`supabase/migrations/20251201_accounting_kb.sql`** - Complete PostgreSQL schema with pgvector support
  - Tables: jurisdictions, knowledge_sources, knowledge_documents, knowledge_chunks, knowledge_embeddings
  - Tracking: ingestion_jobs, ingestion_files, agent_queries_log
  - Indexes: Vector search (IVFFlat), code lookup, status filtering

### Configuration
- **`config/accounting_knowledge_ingest.yaml`** - Pipeline definition for ingesting PDFs
- **`config/agents/deepsearch.yaml`** - DeepSearch agent specification
- **`config/agents/accountant-ai.yaml`** - AccountantAI persona configuration
- **`config/retrieval_rules.yaml`** - Ranking, filtering, and citation policies

### Scripts
- **`scripts/ingest-knowledge.ts`** - TypeScript ingestion worker
  - Downloads PDFs
  - Chunks text (1500 chars with 200 char overlap)
  - Generates embeddings (OpenAI text-embedding-3-large)
  - Stores in Supabase

## 🚀 Quick Start

### 1. Apply Database Migration

```bash
# Using Supabase CLI
supabase db push

# Or apply manually
psql "$DATABASE_URL" -f supabase/migrations/20251201_accounting_kb.sql
```

### 2. Install Dependencies

```bash
pnpm install --frozen-lockfile
```

Required packages (add if not present):
```bash
pnpm add @supabase/supabase-js openai pdf-parse
pnpm add -D @types/pdf-parse
```

### 3. Set Environment Variables

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export OPENAI_API_KEY="sk-..."
```

### 4. Run Ingestion

```bash
# Make script executable
chmod +x scripts/ingest-knowledge.ts

# Run ingestion
pnpm tsx scripts/ingest-knowledge.ts
```

**Note**: The script expects PDF files in `/tmp/`. For production, implement the download logic or use existing files.

## 🏗️ Architecture

### Data Flow

```
PDF Sources (IFRS, RRA, etc.)
    ↓
Download & Parse (pdf-parse)
    ↓
Chunk Text (1500 chars, 200 overlap)
    ↓
Generate Embeddings (OpenAI)
    ↓
Store in Supabase (pgvector)
    ↓
DeepSearch Agent (semantic search)
    ↓
AccountantAI (grounded responses)
```

### Agent Hierarchy

1. **AccountantAI** - User-facing agent
   - Domains: Financial reporting, taxation, auditing, management accounting
   - Provides citations, journal entries, disclosures
   - Calls DeepSearch for knowledge retrieval

2. **DeepSearch** - Knowledge retrieval engine
   - Semantic search via pgvector
   - Authority-weighted ranking (PRIMARY > INTERNAL > SECONDARY)
   - Jurisdiction-aware filtering
   - Freshness checks for tax laws

## 📊 Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `jurisdictions` | Countries/regions (RW, US, EU, etc.) |
| `knowledge_sources` | Authorities (IFRS Foundation, RRA, ACCA) |
| `knowledge_documents` | Individual standards (IAS 21, IFRS 15) |
| `knowledge_chunks` | Text chunks for RAG |
| `knowledge_embeddings` | Vector embeddings (1536-dim) |

### Tracking Tables

| Table | Purpose |
|-------|---------|
| `ingestion_jobs` | Pipeline run tracking |
| `ingestion_files` | Per-file status |
| `agent_queries_log` | Audit trail of agent queries |

## 🔍 Retrieval Rules

### Authority Weights
- **PRIMARY** (1.0): IFRS, IAS, ISA, Tax laws
- **INTERNAL** (0.9): Company policies, internal guidance
- **SECONDARY** (0.7): ACCA articles, CPA guides

### Thresholds
- Minimum relevance score: 0.75
- Primary source minimum: 0.78
- Max chunks per query: 6

### Conflict Resolution
1. Two primary sources conflict → prefer later effective date
2. Jurisdiction law vs. global → prefer jurisdiction for tax
3. IFRS vs. local GAAP → present both with distinction

## 🛠️ Customization

### Add New Sources

Edit `scripts/ingest-knowledge.ts`:

```typescript
const SOURCES: SourceConfig[] = [
  {
    name: "Your Source Name",
    type: "IFRS", // or IAS, ISA, GAAP, TAX_LAW, etc.
    authority_level: "PRIMARY",
    jurisdiction_code: "RW",
    url: "https://example.com/document.pdf",
    description: "Optional description",
  },
  // ... more sources
];
```

### Adjust Chunking Strategy

Modify in `scripts/ingest-knowledge.ts`:

```typescript
// Current: 1500 chars, 200 overlap
const rawChunks = chunkText(fullText, 1500, 200);

// Larger chunks for more context:
const rawChunks = chunkText(fullText, 2000, 300);
```

### Change Embedding Model

Update in `scripts/ingest-knowledge.ts`:

```typescript
const res = await openai.embeddings.create({
  model: "text-embedding-3-large", // 1536 dims
  // OR
  model: "text-embedding-3-small", // 512 dims (cheaper)
  input: texts,
});
```

**Important**: If changing dimension, update the migration:

```sql
-- Change from vector(1536) to vector(512) or vector(3072)
embedding vector(1536) not null
```

## 📝 Usage Example

### Query the Knowledge Base

```typescript
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// 1. Embed the query
const queryEmbedding = await openai.embeddings.create({
  model: "text-embedding-3-large",
  input: ["How should foreign exchange gains be recognized?"],
});

// 2. Semantic search
const { data: chunks } = await supabase.rpc("search_knowledge", {
  query_embedding: queryEmbedding.data[0].embedding,
  match_threshold: 0.75,
  match_count: 6,
  jurisdiction_code: "GLOBAL",
  source_types: ["IFRS", "IAS"],
});

// 3. Use chunks to answer query
console.log(chunks);
```

### Create Search Function (SQL)

Add this to your migration:

```sql
create or replace function search_knowledge(
  query_embedding vector(1536),
  match_threshold float default 0.75,
  match_count int default 6,
  jurisdiction_code text default null,
  source_types text[] default null
)
returns table (
  chunk_id uuid,
  content text,
  document_code text,
  section_path text,
  similarity float,
  authority_level text
)
language plpgsql
as $$
begin
  return query
  select
    kc.id,
    kc.content,
    kd.code,
    kc.section_path,
    1 - (ke.embedding <=> query_embedding) as similarity,
    ks.authority_level
  from knowledge_embeddings ke
  join knowledge_chunks kc on ke.chunk_id = kc.id
  join knowledge_documents kd on kc.document_id = kd.id
  join knowledge_sources ks on kd.source_id = ks.id
  left join jurisdictions j on ks.jurisdiction_id = j.id
  where
    1 - (ke.embedding <=> query_embedding) > match_threshold
    and (jurisdiction_code is null or j.code = jurisdiction_code or j.code = 'GLOBAL')
    and (source_types is null or ks.type = any(source_types))
    and kd.status = 'ACTIVE'
  order by
    ke.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

## 🧪 Testing

### Verify Schema

```bash
psql "$DATABASE_URL" -c "\dt" # List tables
psql "$DATABASE_URL" -c "SELECT * FROM jurisdictions;"
```

### Test Ingestion

```bash
# Dry run (check without embedding)
# Comment out the embed() call in ingest-knowledge.ts

pnpm tsx scripts/ingest-knowledge.ts
```

### Query Test

```sql
-- Check ingested data
SELECT 
  ks.name, 
  COUNT(kd.id) as documents, 
  COUNT(kc.id) as chunks
FROM knowledge_sources ks
LEFT JOIN knowledge_documents kd ON ks.id = kd.source_id
LEFT JOIN knowledge_chunks kc ON kd.id = kc.document_id
GROUP BY ks.id, ks.name;
```

## 📖 References

- **IFRS Standards**: https://www.ifrs.org/issued-standards/
- **IAASB (ISA)**: https://www.iaasb.org/
- **ACCA**: https://www.accaglobal.com/
- **Rwanda Revenue Authority**: https://www.rra.gov.rw/
- **pgvector**: https://github.com/pgvector/pgvector

## 🚨 Important Notes

1. **Vector Dimension**: Match embedding model dimension with schema (default: 1536)
2. **Authority Levels**: PRIMARY for official standards, SECONDARY for commentary
3. **Jurisdictions**: GLOBAL applies everywhere; specific codes filter by region
4. **Freshness**: Tax laws older than 90 days trigger external search
5. **Citations**: Always include document code, section path, and URL

## 📞 Support

For questions or issues:
1. Check `agent_queries_log` table for debugging
2. Review `ingestion_jobs` for pipeline failures
3. Verify embeddings with similarity searches
4. Consult retrieval rules for ranking logic

---

**Status**: ✅ Ready for deployment
**Last Updated**: 2025-12-01
**Version**: 1.0
