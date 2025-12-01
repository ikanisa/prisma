# DeepSearch Knowledge Base Implementation

**Status**: ✅ COMPLETE - Executable RAG system for AI agents

## Overview

DeepSearch is the complete RAG (Retrieval-Augmented Generation) system that connects AI agents to the curated knowledge base of 200 trusted accounting/audit/tax sources.

## Architecture

```
User Query
    ↓
AI Agent (OpenAI/Gemini)
    ↓
deepSearchTool (function call)
    ↓
deepSearch.ts (generates embedding)
    ↓
match_knowledge_chunks RPC (Postgres)
    ↓
Vector similarity search (pgvector)
    ↓
Returns chunks + metadata
    ↓
Agent synthesizes answer with citations
```

## Components Delivered

### 1. Database Layer ✅

**File**: `supabase/migrations/20251201213700_match_knowledge_chunks_rpc.sql`

Postgres RPC function for vector similarity search:
- Input: query embedding (1536-dim), filters (category, jurisdiction), match count
- Output: Top-k chunks with similarity scores, source names, URLs
- Filters: Only ACTIVE sources/pages, category-specific, jurisdiction-aware
- Performance: Uses pgvector `<=>` operator with indexes

### 2. TypeScript Client ✅

**File**: `src/lib/deepSearch.ts`

Core RAG client:
- `deepSearch()`: Main function - generates OpenAI embedding, calls RPC, returns results
- `deepSearchPresets`: Pre-configured queries for common use cases:
  - `ifrs()` - IFRS standards (GLOBAL)
  - `taxRwanda()` - Rwanda tax (RW)
  - `taxMalta()` - Malta tax (MT)
  - `isa()` - Audit standards (GLOBAL)
  - `corpMalta()` - Malta corporate law (MT)

### 3. OpenAI Agents SDK Integration ✅

**Files**:
- `src/agents/tools/deepSearchTool.ts` - OpenAI tool definition
- `src/agents/accountantIfrsAgent.ts` - IFRS specialist
- `src/agents/taxRwandaAgent.ts` - Rwanda tax specialist
- `src/agents/taxMaltaAgent.ts` - Malta tax specialist
- `src/agents/auditIsaAgent.ts` - ISA audit specialist
- `src/agents/corpMaltaAgent.ts` - Malta corporate specialist
- `src/agents/index.ts` - Registry export

Each agent has:
- Domain-specific instructions
- Citation requirements
- Workflow guidance (which filters to use)
- Constraints (never invent references)

### 4. Gemini Integration ✅

**Files**:
- `src/gemini/tools/deepSearch.ts` - Function declaration
- `src/gemini/handlers/deepSearchHandler.ts` - Handler implementation
- `src/gemini/index.ts` - Exports with usage example

Compatible with Gemini 1.5/2.0 function calling.

## Retrieval Rules by Persona

| Persona | Category | Jurisdiction | Notes |
|---------|----------|--------------|-------|
| IFRS Accountant | IFRS | GLOBAL | Primary standards |
| Tax Rwanda | TAX | RW → GLOBAL | RRA primary, OECD fallback |
| Tax Malta | TAX | MT → EU → GLOBAL | CFR primary, EU/OECD context |
| Audit ISA | ISA, ETHICS | GLOBAL | IAASB standards |
| Corporate Malta | CORP, REG, AML | MT | MFSA regulations |

## Usage Examples

### OpenAI Agent
```typescript
import { accountantIfrsAgent } from './agents';

const response = await accountantIfrsAgent.run({
  messages: [
    { role: 'user', content: 'How does IFRS 15 define control transfer?' }
  ]
});
// Agent calls deep_search_kb, retrieves IFRS 15 chunks, synthesizes answer with citations
```

### Direct DeepSearch
```typescript
import { deepSearchPresets } from './lib/deepSearch';

const results = await deepSearchPresets.ifrs('revenue recognition');
// Returns top 10 IFRS chunks about revenue recognition
```

### Gemini Agent
```typescript
import { geminiDeepSearchDeclaration, handleGeminiDeepSearch } from './gemini';

// Define model with tool
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  tools: [{ functionDeclarations: [geminiDeepSearchDeclaration] }]
});

// Handle function call
const searchResult = await handleGeminiDeepSearch(call.args);
```

## Next Steps (Admin UI - Knowledge Console)

The missing piece for full observability:

1. **Ingestion Monitor**
   - View sync status per source
   - See page count, chunk count, last sync
   - Monitor embedding queue

2. **Search Analytics**
   - Track queries per category/jurisdiction
   - Identify gaps (queries with low similarity scores)
   - Usage by agent/persona

3. **Quality Dashboard**
   - Chunk distribution by source
   - Embedding coverage
   - Stale content alerts (sources not updated in X days)

4. **Admin Actions**
   - Trigger re-sync for specific source
   - Approve/reject new sources
   - Bulk category/jurisdiction updates

## Environment Variables Required

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... # For RPC access
OPENAI_API_KEY=sk-... # For embeddings and agent execution
GOOGLE_API_KEY=... # For Gemini agents (optional)
```

## Migration Deployment

```bash
# Apply migration to Supabase
psql "$DATABASE_URL" -f supabase/migrations/20251201213700_match_knowledge_chunks_rpc.sql

# Or via Supabase CLI
supabase db push
```

## Files Created

1. `supabase/migrations/20251201213700_match_knowledge_chunks_rpc.sql` - RPC function
2. `src/lib/deepSearch.ts` - Core client
3. `src/agents/tools/deepSearchTool.ts` - OpenAI tool
4. `src/agents/accountantIfrsAgent.ts` - IFRS agent
5. `src/agents/taxRwandaAgent.ts` - Rwanda tax agent
6. `src/agents/taxMaltaAgent.ts` - Malta tax agent
7. `src/agents/auditIsaAgent.ts` - ISA audit agent
8. `src/agents/corpMaltaAgent.ts` - Malta corporate agent
9. `src/agents/index.ts` - Agent registry
10. `src/gemini/tools/deepSearch.ts` - Gemini declaration
11. `src/gemini/handlers/deepSearchHandler.ts` - Gemini handler
12. `src/gemini/index.ts` - Gemini exports

## Success Criteria

✅ Postgres RPC function created
✅ TypeScript client with OpenAI embedding
✅ OpenAI tool definition (zod schema)
✅ 5 specialist agents with domain instructions
✅ Gemini integration (function declaration + handler)
✅ Retrieval rules documented
✅ Usage examples provided

**This is now executable, not vibes.** Agents can query 200 trusted sources with category/jurisdiction filtering and get cited, authoritative answers.
