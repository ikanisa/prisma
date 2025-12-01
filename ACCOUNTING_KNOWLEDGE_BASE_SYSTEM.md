# Accounting Knowledge Base System

Complete implementation of the AI-powered accounting, auditing, and tax knowledge system for Prisma Glow.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Agent Definitions](#agent-definitions)
5. [Ingestion Pipeline](#ingestion-pipeline)
6. [Retrieval System](#retrieval-system)
7. [Quick Start](#quick-start)
8. [API Usage](#api-usage)
9. [Monitoring](#monitoring)

## Overview

The Accounting Knowledge Base System provides:

- **Knowledge Storage**: PostgreSQL + pgvector for semantic search
- **Content Sources**: IFRS, IAS, ISA, GAAP, Tax Laws, ACCA, CPA, OECD standards
- **AI Agents**: DeepSearch (retrieval) + AccountantAI (user-facing)
- **Grounding**: All answers backed by authoritative sources with citations
- **Audit Trail**: Complete tracking of what agents retrieved and used

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Query                              │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   AccountantAI Agent                         │
│  • Parses question                                           │
│  • Extracts jurisdiction/context                             │
│  • Calls DeepSearch for knowledge                            │
│  • Drafts answer with citations                              │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   DeepSearch Agent                           │
│  • Semantic search (pgvector)                                │
│  • Keyword fallback                                          │
│  • External web search (if needed)                           │
│  • Ranks by authority + relevance                            │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Knowledge Base                         │
│  • jurisdictions                                             │
│  • knowledge_sources                                         │
│  • knowledge_documents                                       │
│  • knowledge_chunks                                          │
│  • knowledge_embeddings (vector)                             │
│  • agent_queries_log (audit)                                 │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Tables

**jurisdictions** - Geographic/regulatory jurisdictions
```sql
- id (uuid)
- code (text) -- "RW", "EU", "US", "GLOBAL"
- name (text) -- "Rwanda", "European Union"
```

**knowledge_sources** - Authoritative sources
```sql
- id (uuid)
- name (text) -- "IFRS Foundation", "RRA Tax Laws"
- type (enum) -- IFRS, IAS, ISA, GAAP, TAX_LAW, ACCA, CPA, OECD, INTERNAL, OTHER
- authority_level (enum) -- PRIMARY, SECONDARY, INTERNAL
- jurisdiction_id (uuid FK)
- url, description, version, effective_from, effective_to
```

**knowledge_documents** - Individual standards/laws
```sql
- id (uuid)
- source_id (uuid FK)
- title (text) -- "IAS 21: Foreign Exchange"
- code (text) -- "IAS 21", "IFRS 15"
- language_code (text) -- "en", "fr", "rw"
- status (enum) -- ACTIVE, DEPRECATED, DRAFT
- version, effective_from, effective_to, metadata (jsonb)
```

**knowledge_chunks** - RAG units
```sql
- id (uuid)
- document_id (uuid FK)
- chunk_index (integer)
- section_path (text) -- "IAS 21.8-12"
- heading (text)
- content (text) -- the actual chunk text
- tokens (integer)
- jurisdiction_override_id (uuid FK)
- effective_from, effective_to, metadata (jsonb)
```

**knowledge_embeddings** - Vector search
```sql
- id (bigserial)
- chunk_id (uuid FK)
- embedding (vector(1536)) -- or 3072 for text-embedding-3-large
```

**ingestion_jobs** - Pipeline tracking
```sql
- id (uuid)
- source_id (uuid FK)
- status (enum) -- PENDING, RUNNING, COMPLETED, FAILED
- started_at, finished_at, stats (jsonb), error_message
```

**agent_queries_log** - Audit trail
```sql
- id (bigserial)
- agent_name (text) -- "AccountantAI", "DeepSearch"
- user_id (uuid)
- query_text (text)
- response_summary (text)
- top_chunk_ids (uuid[])
- jurisdiction_id (uuid FK)
- created_at, latency_ms, metadata (jsonb)
```

### Migration Files

Located in `supabase/migrations/`:
- `20251201_accounting_knowledge_base.sql` - Core schema
- `20251201_accounting_kb_functions.sql` - Helper functions

## Agent Definitions

### DeepSearch Agent

**Location**: `config/knowledge/deepsearch-agent.yaml`

**Purpose**: Retrieval and verification agent

**Tools**:
- `supabase_semantic_search` - Vector similarity search
- `supabase_keyword_search` - Text-based fallback
- `web_authoritative_search` - External source checking

**Policies**:
- Authority Order: PRIMARY → INTERNAL → SECONDARY
- Min Relevance: 0.75
- Max Chunks: 6
- Freshness: Check external if >180 days old
- Tax Law Stale: >90 days

**Output**: Citations + confidence + audit trail

### AccountantAI Agent

**Location**: `config/knowledge/accountant-ai-agent.yaml`

**Purpose**: User-facing professional assistant

**Domains**: Financial reporting, taxation, auditing, management accounting

**Tools**:
- DeepSearch
- Calculator
- ScenarioBuilder
- JournalEntryGenerator
- DisclosureTemplateGenerator

**Workflows**:
1. **financial_reporting_treatment** - Accounting guidance
2. **tax_computation** - Tax calculations
3. **audit_procedure_design** - Audit procedures
4. **accounting_policy_advice** - Policy recommendations

**Style**: Professional, educational, concise, always with citations

## Ingestion Pipeline

### Configuration

**Location**: `config/knowledge/ingest-pipeline.yaml`

**Steps**:
1. `discover_sources` - Source list
2. `ensure_jurisdictions` - Create jurisdictions
3. `ensure_sources` - Create knowledge sources
4. `download_documents` - Fetch PDFs/HTML
5. `parse_documents` - Extract text
6. `create_documents` - Insert into DB
7. `chunk_documents` - Split into chunks (1500 chars, 200 overlap)
8. `insert_chunks` - Save chunks
9. `embed_chunks` - Generate embeddings (text-embedding-3-small)
10. `insert_embeddings` - Store vectors

### Ingestion Script

**Location**: `scripts/knowledge/ingest.ts`

**Usage**:
```bash
# Install dependencies
pnpm install pdf-parse @supabase/supabase-js openai

# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export OPENAI_API_KEY="your-openai-api-key"

# Run ingestion
pnpm tsx scripts/knowledge/ingest.ts
```

**What it does**:
1. Creates ingestion job
2. For each source:
   - Downloads document
   - Parses to text
   - Creates document record
   - Chunks text (1500 chars, 200 overlap)
   - Generates embeddings in batches of 50
   - Stores in knowledge_embeddings
3. Updates job status + stats

**Current Sources**:
- IFRS Foundation - IAS 21 Foreign Exchange
- IFRS Foundation - IFRS 15 Revenue
- IFRS Foundation - IFRS 16 Leases
- IFRS Foundation - IAS 12 Income Taxes

**Add More Sources**: Edit `SOURCES` array in `scripts/knowledge/ingest.ts`

## Retrieval System

### Retrieval Rules

**Location**: `config/knowledge/retrieval-rules.yaml`

**Ranking**:
- Base: Cosine similarity
- Authority Weights: PRIMARY (1.0), INTERNAL (0.9), SECONDARY (0.7)
- Recency: Decay half-life 365 days
- Jurisdiction: +15% for exact match, +5% for global fallback

**Thresholds**:
- Min Score: 0.75
- Min Primary Score (standards): 0.78
- Max Chunks: 6

**Selection Strategy**:
1. Group by document (prefer context)
2. Diversify sources (include commentary)

**Citation Format**: Inline references like `(IAS 21.8-12, IFRS Foundation)`

### Semantic Search Function

Example PostgreSQL function (in `20251201_accounting_kb_functions.sql`):

```sql
create or replace function search_knowledge(
  query_embedding vector(1536),
  match_threshold float default 0.75,
  match_count int default 10,
  filter_jurisdiction text default null,
  filter_types text[] default null,
  filter_authority text[] default null
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_code text,
  document_title text,
  section_path text,
  content text,
  similarity float,
  authority_level text,
  jurisdiction_code text,
  source_url text
)
language plpgsql
as $$
begin
  return query
  select
    kc.id as chunk_id,
    kd.id as document_id,
    kd.code as document_code,
    kd.title as document_title,
    kc.section_path,
    kc.content,
    1 - (ke.embedding <=> query_embedding) as similarity,
    ks.authority_level,
    j.code as jurisdiction_code,
    ks.url as source_url
  from knowledge_embeddings ke
  join knowledge_chunks kc on kc.id = ke.chunk_id
  join knowledge_documents kd on kd.id = kc.document_id
  join knowledge_sources ks on ks.id = kd.source_id
  join jurisdictions j on j.id = ks.jurisdiction_id
  where 
    (1 - (ke.embedding <=> query_embedding)) > match_threshold
    and (filter_jurisdiction is null or j.code = filter_jurisdiction)
    and (filter_types is null or ks.type = any(filter_types))
    and (filter_authority is null or ks.authority_level = any(filter_authority))
  order by similarity desc
  limit match_count;
end;
$$;
```

## Quick Start

### 1. Database Setup

Apply migrations:
```bash
# Connect to Supabase
psql "$DATABASE_URL"

# Apply migrations
\i supabase/migrations/20251201_accounting_knowledge_base.sql
\i supabase/migrations/20251201_accounting_kb_functions.sql
```

Or use Supabase CLI:
```bash
supabase migration up
```

### 2. Ingest Knowledge

```bash
cd /Users/jeanbosco/workspace/prisma

# Set environment
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-key"
export OPENAI_API_KEY="your-key"

# Run ingestion
pnpm tsx scripts/knowledge/ingest.ts
```

### 3. Query Knowledge

TypeScript example:
```typescript
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI();

async function queryKnowledge(question: string) {
  // 1. Generate query embedding
  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
  });
  const queryEmbedding = embeddingRes.data[0].embedding;

  // 2. Semantic search
  const { data, error } = await supabase.rpc('search_knowledge', {
    query_embedding: queryEmbedding,
    match_threshold: 0.75,
    match_count: 6,
    filter_types: ['IFRS', 'IAS'],
    filter_authority: ['PRIMARY'],
  });

  if (error) throw error;

  // 3. Format response
  const citations = data.map((d: any) => ({
    code: d.document_code,
    section: d.section_path,
    text: d.content,
    similarity: d.similarity,
    url: d.source_url,
  }));

  return citations;
}

// Example usage
const results = await queryKnowledge('How do I account for foreign exchange gains?');
console.log(results);
```

## API Usage

### Ingestion API

```typescript
import { scheduleLearningRun } from '@/services/rag/knowledge/ingestion';

const run = await scheduleLearningRun({
  orgId: 'org-123',
  agentKind: 'FINANCE',
  mode: 'INITIAL',
  corpusId: 'ifrs-standards',
  sourceId: 'ifrs-foundation',
  initiatedBy: 'user-456',
});

console.log('Ingestion job:', run.id);
```

### Query API

```typescript
// 1. Call DeepSearch agent
const searchResults = await fetch('/api/agents/deepsearch/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'What is the treatment for foreign exchange differences under IAS 21?',
    jurisdiction_code: 'GLOBAL',
    types: ['IAS'],
    top_k: 6,
  }),
});

const { chunks, confidence } = await searchResults.json();

// 2. Call AccountantAI for formatted answer
const answer = await fetch('/api/agents/accountant-ai/answer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'What is the treatment for foreign exchange differences under IAS 21?',
    context: chunks,
  }),
});

const { response, citations, journal_entries } = await answer.json();
```

### Audit Trail

```typescript
// Log query for audit
await supabase.from('agent_queries_log').insert({
  agent_name: 'AccountantAI',
  user_id: currentUser.id,
  query_text: question,
  response_summary: response.substring(0, 500),
  top_chunk_ids: chunks.map(c => c.chunk_id),
  jurisdiction_id: jurisdictionId,
  latency_ms: Date.now() - startTime,
  metadata: {
    confidence,
    sources_used: citations.length,
  },
});
```

## Monitoring

### Key Metrics

1. **Ingestion Health**
   ```sql
   select 
     status,
     count(*),
     avg(extract(epoch from (finished_at - started_at)))::int as avg_duration_sec
   from ingestion_jobs
   where created_at > now() - interval '7 days'
   group by status;
   ```

2. **Knowledge Coverage**
   ```sql
   select 
     ks.type,
     ks.authority_level,
     count(distinct kd.id) as documents,
     count(kc.id) as chunks,
     sum(kc.tokens) as total_tokens
   from knowledge_sources ks
   join knowledge_documents kd on kd.source_id = ks.id
   join knowledge_chunks kc on kc.document_id = kd.id
   group by ks.type, ks.authority_level
   order by ks.type, ks.authority_level;
   ```

3. **Query Performance**
   ```sql
   select 
     agent_name,
     date_trunc('hour', created_at) as hour,
     count(*) as queries,
     avg(latency_ms)::int as avg_latency,
     percentile_cont(0.95) within group (order by latency_ms)::int as p95_latency
   from agent_queries_log
   where created_at > now() - interval '24 hours'
   group by agent_name, hour
   order by hour desc;
   ```

4. **Citation Quality**
   ```sql
   select 
     agent_name,
     avg(array_length(top_chunk_ids, 1))::numeric(10,2) as avg_chunks_per_query,
     count(*) filter (where array_length(top_chunk_ids, 1) = 0) as queries_without_sources
   from agent_queries_log
   where created_at > now() - interval '7 days'
   group by agent_name;
   ```

### Health Checks

```bash
# Check vector index health
psql "$DATABASE_URL" -c "
select 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
from pg_stat_user_indexes
where indexname like '%embedding%';
"

# Check chunk distribution
psql "$DATABASE_URL" -c "
select 
  kd.code,
  count(kc.id) as chunks,
  min(kc.tokens) as min_tokens,
  avg(kc.tokens)::int as avg_tokens,
  max(kc.tokens) as max_tokens
from knowledge_documents kd
join knowledge_chunks kc on kc.document_id = kd.id
group by kd.code
order by count(kc.id) desc
limit 20;
"
```

## Next Steps

1. **Expand Sources**: Add more IFRS/IAS standards, Rwanda tax laws, ACCA guides
2. **Improve Chunking**: Implement section-aware chunking (respect standard paragraphs)
3. **Multi-language**: Add French and Kinyarwanda content
4. **Freshness**: Implement automatic update checking
5. **Validation**: Add human review loop for low-confidence answers
6. **Cache**: Implement query result caching
7. **Analytics**: Track user satisfaction and answer quality

## Files Reference

### Configuration
- `config/knowledge/deepsearch-agent.yaml` - DeepSearch agent definition
- `config/knowledge/accountant-ai-agent.yaml` - AccountantAI agent definition
- `config/knowledge/ingest-pipeline.yaml` - Ingestion pipeline spec
- `config/knowledge/retrieval-rules.yaml` - Retrieval rules and ranking

### Code
- `scripts/knowledge/ingest.ts` - Main ingestion script
- `services/rag/knowledge/ingestion.ts` - Ingestion API
- `supabase/migrations/20251201_accounting_knowledge_base.sql` - Schema
- `supabase/migrations/20251201_accounting_kb_functions.sql` - Search functions

### Documentation
- `config/knowledge/QUICK_START.md` - Quick start guide
- This file - Complete system documentation

## Support

For questions or issues:
1. Check `config/knowledge/QUICK_START.md`
2. Review agent definitions in `config/knowledge/`
3. Inspect database with monitoring queries above
4. Check logs in `ingestion_jobs` and `ingestion_files` tables

---

**Status**: ✅ Fully Implemented and Production Ready

**Last Updated**: December 1, 2025
