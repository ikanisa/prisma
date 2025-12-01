# Accounting Knowledge Base System

Complete system for ingesting, storing, and retrieving IFRS, IAS, ISA, GAAP, tax laws, and professional accounting guidance.

## 📁 Files Created

### 1. Database Schema
**`supabase/migrations/20251201170000_accounting_knowledge_base.sql`**

Complete PostgreSQL schema with pgvector support for:
- Jurisdictions (countries/regions)
- Knowledge sources (IFRS, IAS, tax authorities, etc.)
- Knowledge documents (individual standards/laws)
- Knowledge chunks (RAG text units)
- Knowledge embeddings (vector embeddings)
- Ingestion jobs and files (pipeline tracking)
- Agent queries log (audit trail)

Includes semantic search function: `search_knowledge_semantic()`

### 2. Pipeline Configuration
**`config/knowledge/ingest-pipeline.yaml`**

Declarative pipeline definition for ingesting documents:
- Source discovery
- Document download
- Text parsing
- Chunking strategy
- Embedding generation
- Error handling and monitoring

### 3. Agent Definitions

**`config/knowledge/deepsearch-agent.yaml`**
- Semantic search agent
- Authority-based ranking
- Freshness checking
- Conflict resolution
- Citation generation

**`config/knowledge/accountant-ai-agent.yaml`**
- User-facing accountant assistant
- Calls DeepSearch for retrieval
- Generates journal entries and examples
- Professional tone and disclaimers
- Escalation rules

### 4. Retrieval Rules
**`config/knowledge/retrieval-rules.yaml`**

Logic for combining and ranking search results:
- Authority weights (PRIMARY > INTERNAL > SECONDARY)
- Recency decay
- Jurisdiction matching
- Citation policy
- Fallback strategies

### 5. Ingestion Script
**`scripts/knowledge/ingest.ts`**

TypeScript implementation of the ingestion pipeline:
- Downloads PDFs/HTML from URLs
- Parses documents
- Chunks text with overlap
- Generates embeddings via OpenAI
- Stores in Supabase
- Tracks progress in ingestion_jobs table

## 🚀 Quick Start

### Prerequisites

```bash
# 1. Install dependencies
pnpm install @supabase/supabase-js openai pdf-parse

# 2. Set environment variables
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export OPENAI_API_KEY="your-openai-api-key"
```

### Run Migration

```bash
# Apply the database schema
psql "$DATABASE_URL" -f supabase/migrations/20251201170000_accounting_knowledge_base.sql

# Or via Supabase CLI
supabase db push
```

### Ingest Knowledge

```bash
# Run the ingestion script
pnpm tsx scripts/knowledge/ingest.ts
```

This will:
1. Create a new ingestion job
2. Download documents from configured URLs
3. Parse and chunk the text
4. Generate embeddings
5. Store everything in Supabase

### Query the Knowledge Base

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Generate query embedding
const queryEmbedding = await generateEmbedding("How do I account for foreign exchange gains?");

// Search knowledge base
const { data, error } = await supabase.rpc("search_knowledge_semantic", {
  query_embedding: queryEmbedding,
  match_threshold: 0.75,
  match_count: 10,
  filter_jurisdiction_id: null, // or specific UUID
  filter_types: ["IFRS", "IAS"],
  filter_authority_levels: ["PRIMARY"],
});

console.log(data);
```

## 📊 Database Schema

### Core Tables

```
jurisdictions
├── id (uuid)
├── code (text) - e.g., "RW", "GLOBAL"
└── name (text)

knowledge_sources
├── id (uuid)
├── name (text)
├── type (enum) - IFRS, IAS, ISA, GAAP, TAX_LAW, etc.
├── jurisdiction_id (uuid)
├── authority_level (enum) - PRIMARY, SECONDARY, INTERNAL
└── url (text)

knowledge_documents
├── id (uuid)
├── source_id (uuid)
├── title (text)
├── code (text) - e.g., "IAS 21"
└── status (enum) - ACTIVE, DEPRECATED, DRAFT

knowledge_chunks
├── id (uuid)
├── document_id (uuid)
├── chunk_index (integer)
├── section_path (text) - e.g., "IAS 21.8-12"
├── content (text)
└── tokens (integer)

knowledge_embeddings
├── id (bigserial)
├── chunk_id (uuid)
├── embedding (vector(1536))
└── model (text)
```

### Tracking Tables

```
ingestion_jobs
├── id (uuid)
├── status (enum) - PENDING, RUNNING, COMPLETED, FAILED
├── stats (jsonb)
└── timestamps

ingestion_files
├── id (uuid)
├── job_id (uuid)
├── uri (text)
├── status (enum)
└── error_message (text)

agent_queries_log
├── id (bigserial)
├── agent_name (text)
├── query_text (text)
├── top_chunk_ids (uuid[])
└── metadata (jsonb)
```

## 🔧 Configuration

### Adding New Sources

Edit `scripts/knowledge/ingest.ts` and add to the `SOURCES` array:

```typescript
{
  name: "Rwanda Income Tax Act 2023",
  type: "TAX_LAW",
  authority_level: "PRIMARY",
  jurisdiction_code: "RW",
  url: "https://www.rra.gov.rw/path/to/document.pdf",
  code: "RW-ITA-2023",
  description: "Rwanda Income Tax Act 2023",
}
```

### Adjusting Chunk Size

Modify constants in `scripts/knowledge/ingest.ts`:

```typescript
const CHUNK_SIZE = 1500;      // Max characters per chunk
const CHUNK_OVERLAP = 200;     // Overlap between chunks
const BATCH_SIZE = 50;         // Embeddings per API call
```

### Changing Embedding Model

Update in both the script and migration:

```typescript
// scripts/knowledge/ingest.ts
const EMBEDDING_MODEL = "text-embedding-3-large";

// If using 3-large, update vector dimension to 3072:
// ALTER TABLE knowledge_embeddings 
// ALTER COLUMN embedding TYPE vector(3072);
```

## 🤖 Agent Integration

### DeepSearch Agent

```typescript
import { DeepSearchAgent } from "./agents/deepsearch";

const agent = new DeepSearchAgent({
  supabase,
  openai,
  config: await loadYaml("config/knowledge/deepsearch-agent.yaml"),
});

const results = await agent.search({
  query: "How do I account for lease modifications under IFRS 16?",
  jurisdiction: "GLOBAL",
  types: ["IFRS"],
});

console.log(results.answer);
console.log(results.citations);
console.log(results.confidence);
```

### AccountantAI Agent

```typescript
import { AccountantAIAgent } from "./agents/accountant-ai";

const agent = new AccountantAIAgent({
  deepSearch: deepSearchAgent,
  config: await loadYaml("config/knowledge/accountant-ai-agent.yaml"),
});

const response = await agent.answer({
  query: "What's the Rwanda corporate tax rate and how do I compute taxable income?",
  userId: "user-123",
  jurisdiction: "RW",
});

console.log(response.answer);
console.log(response.workings);
console.log(response.citations);
```

## 📈 Monitoring

### View Ingestion Status

```sql
-- Current jobs
SELECT * FROM ingestion_jobs 
ORDER BY created_at DESC 
LIMIT 10;

-- Job statistics
SELECT 
  status,
  COUNT(*) as count,
  AVG((stats->>'chunks')::int) as avg_chunks
FROM ingestion_jobs
GROUP BY status;
```

### Query Performance

```sql
-- Agent query log
SELECT 
  agent_name,
  COUNT(*) as query_count,
  AVG(latency_ms) as avg_latency_ms
FROM agent_queries_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY agent_name;
```

### Knowledge Coverage

```sql
-- Documents by type
SELECT 
  ks.type,
  COUNT(DISTINCT kd.id) as doc_count,
  COUNT(kc.id) as chunk_count
FROM knowledge_sources ks
LEFT JOIN knowledge_documents kd ON kd.source_id = ks.id
LEFT JOIN knowledge_chunks kc ON kc.document_id = kd.id
GROUP BY ks.type;
```

## 🔍 Testing

### Test Semantic Search

```sql
-- Generate a test embedding (you'll need to do this in your app)
-- Then query:
SELECT * FROM search_knowledge_semantic(
  query_embedding := '[0.1, 0.2, ...]'::vector(1536),
  match_threshold := 0.75,
  match_count := 5,
  filter_types := ARRAY['IFRS', 'IAS']
);
```

### Test Full Pipeline

```bash
# 1. Run ingestion
pnpm tsx scripts/knowledge/ingest.ts

# 2. Check results
psql $DATABASE_URL -c "SELECT COUNT(*) FROM knowledge_chunks;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM knowledge_embeddings;"

# 3. Test search (requires your app code)
pnpm tsx scripts/knowledge/test-search.ts
```

## 🛠 Maintenance

### Update Document

```sql
-- Mark old version as deprecated
UPDATE knowledge_documents 
SET status = 'DEPRECATED', effective_to = '2024-12-31'
WHERE code = 'IAS 21' AND status = 'ACTIVE';

-- Ingest new version (run script or manual insert)
```

### Clean Up Old Data

```sql
-- Delete deprecated documents older than 2 years
DELETE FROM knowledge_documents
WHERE status = 'DEPRECATED' 
  AND effective_to < NOW() - INTERVAL '2 years';

-- This will cascade to chunks and embeddings
```

### Rebuild Embeddings

```bash
# If you change embedding models, re-run ingestion
# Or create a script to re-embed existing chunks:
pnpm tsx scripts/knowledge/rebuild-embeddings.ts
```

## 📚 Resources

- **IFRS Standards**: https://www.ifrs.org/issued-standards/
- **ISA Standards**: https://www.iaasb.org/publications
- **Rwanda Tax Laws**: https://www.rra.gov.rw/
- **ACCA Resources**: https://www.accaglobal.com/

## 🤝 Contributing

To add new knowledge sources:

1. Add source configuration to `scripts/knowledge/ingest.ts`
2. Ensure the document is publicly accessible
3. Run ingestion script
4. Verify in database
5. Test search results

## 📝 License

This system is part of Prisma Glow. See main LICENSE file.

## 🆘 Support

For issues or questions:
- Check logs in `ingestion_jobs` and `ingestion_files` tables
- Review retrieval quality in `agent_queries_log`
- Adjust thresholds in `retrieval-rules.yaml`
- See main Prisma Glow documentation
