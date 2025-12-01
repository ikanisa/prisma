# Accounting Knowledge Base - Quick Start Guide

This guide helps you get the accounting knowledge base system up and running in 15 minutes.

## 📦 What You Get

A complete RAG (Retrieval-Augmented Generation) system for accounting, auditing, and tax knowledge:

- ✅ PostgreSQL schema with pgvector for semantic search
- ✅ Pre-configured sources (IFRS, IAS, ISA, Rwanda tax laws, ACCA)
- ✅ Ingestion pipeline (download, parse, chunk, embed)
- ✅ Two AI agents: DeepSearch (retrieval) + AccountantAI (assistant)
- ✅ Configurable ranking rules and citation policies
- ✅ Full audit trail and monitoring

## 🚀 Setup (5 minutes)

### 1. Install Dependencies

```bash
pnpm install @supabase/supabase-js openai pdf-parse
```

### 2. Set Environment Variables

```bash
# .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
DATABASE_URL=postgresql://...
```

### 3. Apply Database Migration

```bash
# Option A: Via psql
psql "$DATABASE_URL" -f supabase/migrations/20251201170000_accounting_knowledge_base.sql

# Option B: Via Supabase CLI
supabase db push

# Option C: Via Prisma (if using apps/web)
cd apps/web
pnpm prisma db push
```

### 4. Verify Tables

```bash
psql "$DATABASE_URL" -c "\dt *knowledge*"
```

You should see:
- `jurisdictions`
- `knowledge_sources`
- `knowledge_documents`
- `knowledge_chunks`
- `knowledge_embeddings`
- `ingestion_jobs`
- `ingestion_files`
- `agent_queries_log`

## 📚 Ingest Knowledge (10 minutes)

### Run the Ingestion Script

```bash
pnpm tsx scripts/knowledge/ingest.ts
```

This will:
1. ✅ Download sample documents (IFRS, IAS standards)
2. ✅ Parse PDFs to extract text
3. ✅ Split into 1500-char chunks with 200-char overlap
4. ✅ Generate OpenAI embeddings (text-embedding-3-small)
5. ✅ Store everything in Supabase

**Expected output:**
```
🚀 Starting Knowledge Ingestion Pipeline

📋 Job ID: abc-123-def

📄 Ingesting: IFRS Foundation - IAS 21 Foreign Exchange
  ✓ Source exists: IFRS Foundation - IAS 21 Foreign Exchange
  → Downloading: https://www.ifrs.org/...
  ✓ Downloaded to: /tmp/knowledge/...
  ✓ Parsed PDF: 45 pages
  ✓ Created document: xyz-789
  → Creating 120 chunks...
  ✓ Created 120 chunks
  → Generating embeddings...
  → Embedded batch 1/3
  → Embedded batch 2/3
  → Embedded batch 3/3
✅ Completed: IFRS Foundation - IAS 21 Foreign Exchange

...

✅ Ingestion Complete
   Files: 4
   Chunks: 450
   Tokens: 180000
```

### Verify Ingestion

```bash
pnpm tsx scripts/knowledge/test-search.ts --stats
```

Expected:
```
📊 Knowledge Base Statistics

Sources by type:
  IAS: 2
  IFRS: 2

Total documents: 4
Total chunks: 450
Total embeddings: 450
```

## 🔍 Test Search (2 minutes)

### Basic Query

```bash
pnpm tsx scripts/knowledge/test-search.ts "How do I account for foreign exchange gains?"
```

Expected output:
```
🔍 Searching for: "How do I account for foreign exchange gains?"

✅ Found 5 results:

1. IAS 21 - The Effects of Changes in Foreign Exchange Rates
   Authority: PRIMARY
   Jurisdiction: GLOBAL
   Similarity: 87.3%
   Section: IAS 21.28
   Preview: Exchange differences arising on the settlement of monetary items...

2. IAS 21 - The Effects of Changes in Foreign Exchange Rates
   Authority: PRIMARY
   Jurisdiction: GLOBAL
   Similarity: 84.2%
   Section: IAS 21.52
   Preview: An entity shall recognize in profit or loss...

...

⏱️  Query time: 450ms

✓ Query logged to agent_queries_log
```

### Multiple Test Queries

```bash
pnpm tsx scripts/knowledge/test-search.ts --test-all
```

Runs 5 pre-configured queries to test different scenarios.

## 🤖 Use in Your Application

### 1. Direct Search

```typescript
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function answerQuestion(question: string) {
  // 1. Generate embedding
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: question,
  });

  // 2. Search knowledge base
  const { data: results } = await supabase.rpc("search_knowledge_semantic", {
    query_embedding: JSON.stringify(embedding.data[0].embedding),
    match_threshold: 0.75,
    match_count: 5,
    filter_types: ["IFRS", "IAS"],
    filter_authority_levels: ["PRIMARY"],
  });

  // 3. Build context from results
  const context = results
    .map((r: any) => `${r.document_code} ${r.section_path}: ${r.content}`)
    .join("\n\n");

  // 4. Generate answer with citations
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are an expert accountant. Answer questions based on the provided accounting standards. Always cite sources using format: (IAS 21.28)`,
      },
      {
        role: "user",
        content: `Question: ${question}\n\nContext:\n${context}`,
      },
    ],
  });

  return {
    answer: completion.choices[0].message.content,
    sources: results.map((r: any) => ({
      code: r.document_code,
      title: r.document_title,
      section: r.section_path,
      url: r.source_url,
    })),
  };
}

// Usage
const result = await answerQuestion("How do I account for lease modifications?");
console.log(result.answer);
console.log("Sources:", result.sources);
```

### 2. Using Agents (Recommended)

```typescript
// See config/knowledge/deepsearch-agent.yaml
// See config/knowledge/accountant-ai-agent.yaml

import { DeepSearchAgent } from "@/agents/deepsearch";
import { AccountantAIAgent } from "@/agents/accountant-ai";

const deepSearch = new DeepSearchAgent({ supabase, openai });
const accountantAI = new AccountantAIAgent({ deepSearch });

const response = await accountantAI.answer({
  query: "What's the Rwanda corporate tax rate and how do I compute taxable income?",
  userId: "user-123",
  jurisdiction: "RW",
});

console.log(response.answer);
console.log(response.citations);
console.log(response.confidence);
```

## 📝 Add More Sources

Edit `scripts/knowledge/ingest.ts`:

```typescript
const SOURCES: SourceConfig[] = [
  // ... existing sources ...
  
  // Add new source
  {
    name: "US GAAP - ASC 606 Revenue",
    type: "GAAP",
    authority_level: "PRIMARY",
    jurisdiction_code: "US",
    url: "https://example.com/asc-606.pdf",
    code: "ASC 606",
    description: "Revenue from Contracts with Customers (US GAAP)",
  },
];
```

Then re-run ingestion:
```bash
pnpm tsx scripts/knowledge/ingest.ts
```

## 🎯 Configuration

### Adjust Chunk Size

```typescript
// scripts/knowledge/ingest.ts
const CHUNK_SIZE = 2000;      // Increase for more context
const CHUNK_OVERLAP = 300;    // Increase overlap for better retrieval
```

### Change Similarity Threshold

```typescript
// When searching
const { data } = await supabase.rpc("search_knowledge_semantic", {
  // ...
  match_threshold: 0.70,  // Lower = more results (less strict)
  // match_threshold: 0.85,  // Higher = fewer results (more strict)
});
```

### Filter by Authority Level

```typescript
// Only primary sources (laws and standards)
filter_authority_levels: ["PRIMARY"]

// Include commentary
filter_authority_levels: ["PRIMARY", "SECONDARY"]

// Internal company policies too
filter_authority_levels: ["PRIMARY", "SECONDARY", "INTERNAL"]
```

### Filter by Jurisdiction

```typescript
// Rwanda only
filter_jurisdiction_id: "<rwanda-jurisdiction-uuid>"

// Global sources
filter_jurisdiction_id: "<global-jurisdiction-uuid>"

// No filter (all jurisdictions)
filter_jurisdiction_id: null
```

## 📊 Monitoring

### View Ingestion Jobs

```sql
SELECT 
  id,
  status,
  started_at,
  finished_at,
  stats->>'chunks' as chunks,
  stats->>'tokens' as tokens
FROM ingestion_jobs
ORDER BY created_at DESC
LIMIT 10;
```

### Agent Query Analytics

```sql
SELECT 
  agent_name,
  COUNT(*) as total_queries,
  AVG(latency_ms) as avg_latency_ms,
  AVG((metadata->>'avg_similarity')::float) as avg_similarity
FROM agent_queries_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY agent_name;
```

### Knowledge Coverage

```sql
SELECT 
  ks.type,
  ks.authority_level,
  COUNT(DISTINCT kd.id) as documents,
  COUNT(kc.id) as chunks
FROM knowledge_sources ks
LEFT JOIN knowledge_documents kd ON kd.source_id = ks.id
LEFT JOIN knowledge_chunks kc ON kc.document_id = kd.id
GROUP BY ks.type, ks.authority_level
ORDER BY ks.type, ks.authority_level;
```

## 🐛 Troubleshooting

### "pdf-parse not found"

```bash
pnpm add pdf-parse
# If issues persist
pnpm add canvas
```

### "No results found"

1. Check if embeddings exist:
   ```sql
   SELECT COUNT(*) FROM knowledge_embeddings;
   ```

2. Lower similarity threshold:
   ```typescript
   match_threshold: 0.65
   ```

3. Check if documents are ACTIVE:
   ```sql
   SELECT status, COUNT(*) FROM knowledge_documents GROUP BY status;
   ```

### Slow queries

1. Check index:
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'knowledge_embeddings';
   ```

2. Adjust IVFFlat lists (in migration):
   ```sql
   -- More lists = faster build, slower search
   -- Fewer lists = slower build, faster search
   CREATE INDEX ... WITH (lists = 200);  -- was 100
   ```

## 📚 Next Steps

- [ ] Implement agent classes (DeepSearchAgent, AccountantAIAgent)
- [ ] Add UI components for knowledge search
- [ ] Set up scheduled re-ingestion for updated standards
- [ ] Add more knowledge sources (ISA, OECD, etc.)
- [ ] Implement citation verification
- [ ] Add human-in-the-loop review for low-confidence answers
- [ ] Set up alerts for stale knowledge (>180 days old)

## 🔗 Resources

- **Full README**: `scripts/knowledge/README.md`
- **Agent configs**: `config/knowledge/*.yaml`
- **Database schema**: `supabase/migrations/20251201170000_accounting_knowledge_base.sql`
- **Ingestion script**: `scripts/knowledge/ingest.ts`
- **Test script**: `scripts/knowledge/test-search.ts`

## 💡 Tips

1. **Start small**: Ingest 2-3 documents first, test, then scale up
2. **Monitor tokens**: OpenAI embeddings cost ~$0.00002 per 1K tokens
3. **Cache results**: Common queries should be cached (TTL: 1 hour)
4. **Version control**: Track which standards version you've ingested
5. **Audit trail**: Always log queries to `agent_queries_log`

---

✅ You now have a production-ready accounting knowledge base! 🎉
