# RAG Integration Guide for AI Agents

## Overview

This guide shows you how to integrate the RAG (Retrieval-Augmented Generation) knowledge base into your existing AI agents using the `deep_search_knowledge()` function.

## Prerequisites

- ✅ RAG migration applied (`knowledge_web_pages`, `knowledge_chunks` tables exist)
- ✅ Initial ingestion completed (at least 5-10 URLs processed)
- ✅ `deep_search_knowledge()` function available in database
- ✅ Environment variables set (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`)

## Architecture

```
User Query
    ↓
1. Embed query (OpenAI)
    ↓
2. Search knowledge base (deep_search_knowledge)
    ↓
3. Get top N relevant chunks
    ↓
4. Build context from chunks
    ↓
5. Send to LLM (GPT-4) with context
    ↓
6. Return grounded response with citations
```

## Core RAG Helper Module

Create a reusable RAG helper module:

**File**: `packages/lib/src/rag-helper.ts`

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export interface RAGSearchParams {
  query: string;
  category?: string;
  jurisdiction?: string;
  tags?: string[];
  limit?: number;
}

export interface RAGChunk {
  chunk_id: number;
  content: string;
  category: string;
  jurisdiction_code: string;
  tags: string[];
  source_name: string;
  source_url: string;
  page_url: string;
  similarity: number;
}

export class RAGHelper {
  private supabase: SupabaseClient;
  private openai: OpenAI;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    openaiKey: string
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.openai = new OpenAI({ apiKey: openaiKey });
  }

  /**
   * Embed a query using OpenAI text-embedding-3-large
   */
  async embedQuery(query: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: query,
    });

    return response.data[0].embedding;
  }

  /**
   * Search knowledge base using semantic similarity
   */
  async searchKnowledge(params: RAGSearchParams): Promise<RAGChunk[]> {
    const { query, category, jurisdiction, tags, limit = 10 } = params;

    // 1. Embed the query
    const queryEmbedding = await this.embedQuery(query);

    // 2. Call deep_search_knowledge RPC
    const { data, error } = await this.supabase.rpc('deep_search_knowledge', {
      query_embedding: queryEmbedding,
      p_category: category || null,
      p_jurisdiction: jurisdiction || null,
      p_tags: tags || null,
      p_limit: limit,
    });

    if (error) throw error;

    return data as RAGChunk[];
  }

  /**
   * Build context string from chunks for LLM prompt
   */
  buildContext(chunks: RAGChunk[], maxChunks = 10): string {
    const topChunks = chunks.slice(0, maxChunks);

    return topChunks
      .map((chunk, idx) => {
        const citation = `[${idx + 1}] ${chunk.source_name} (${chunk.jurisdiction_code})`;
        return `${citation}\n${chunk.content}\n`;
      })
      .join('\n---\n\n');
  }

  /**
   * Build citations list for response
   */
  buildCitations(chunks: RAGChunk[]): string {
    return chunks
      .map((chunk, idx) => {
        return `[${idx + 1}] ${chunk.source_name} - ${chunk.page_url}`;
      })
      .join('\n');
  }

  /**
   * Full RAG query: search + build context
   */
  async query(params: RAGSearchParams): Promise<{
    context: string;
    citations: string;
    chunks: RAGChunk[];
  }> {
    const chunks = await this.searchKnowledge(params);
    const context = this.buildContext(chunks);
    const citations = this.buildCitations(chunks);

    return { context, citations, chunks };
  }
}

// Singleton instance
let ragHelperInstance: RAGHelper | null = null;

export function getRAGHelper(): RAGHelper {
  if (!ragHelperInstance) {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const openaiKey = process.env.OPENAI_API_KEY!;

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      throw new Error('Missing environment variables for RAG helper');
    }

    ragHelperInstance = new RAGHelper(supabaseUrl, supabaseKey, openaiKey);
  }

  return ragHelperInstance;
}
```

## Example 1: Rwanda Tax Agent with RAG

**File**: `apps/gateway/src/agents/rwanda-tax-agent.ts`

```typescript
import { getRAGHelper } from '@prisma-glow/lib';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const rag = getRAGHelper();

export async function askRwandaTaxAgent(userQuery: string): Promise<string> {
  // 1. Search knowledge base for Rwanda tax content
  const { context, citations } = await rag.query({
    query: userQuery,
    category: 'TAX',
    jurisdiction: 'RW',
    limit: 10,
  });

  // 2. Build system prompt with RAG context
  const systemPrompt = `You are a Rwanda tax compliance agent. Your role is to provide accurate tax guidance based ONLY on official Rwanda Revenue Authority (RRA) sources and OECD guidelines.

**CRITICAL RULES**:
- Use ONLY the provided context below. Do not use your training data.
- If the context doesn't contain the answer, say "I don't have enough information in my knowledge base to answer this."
- Always cite sources using [1], [2], etc. references.
- Be precise with tax rates, deadlines, and compliance requirements.

**KNOWLEDGE BASE CONTEXT**:
${context}

**CITATIONS**:
${citations}`;

  // 3. Send to OpenAI
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuery },
    ],
    temperature: 0.1, // Low temperature for factual responses
  });

  return completion.choices[0].message.content || 'No response generated.';
}

// Example usage
async function main() {
  const answer = await askRwandaTaxAgent(
    'What is the VAT rate for exported services in Rwanda?'
  );

  console.log(answer);
  // Expected: "According to RRA guidelines [1], exported services are zero-rated for VAT purposes in Rwanda..."
}
```

## Example 2: IFRS Audit Agent with RAG

**File**: `apps/gateway/src/agents/ifrs-audit-agent.ts`

```typescript
import { getRAGHelper } from '@prisma-glow/lib';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const rag = getRAGHelper();

export async function askIFRSAuditAgent(
  userQuery: string,
  specificStandards?: string[]
): Promise<{
  answer: string;
  relevantStandards: string[];
  citations: string;
}> {
  // 1. Search IFRS and ISA standards
  const { context, citations, chunks } = await rag.query({
    query: userQuery,
    category: 'IFRS',
    jurisdiction: 'GLOBAL',
    tags: specificStandards,
    limit: 15,
  });

  // 2. Extract relevant standards from results
  const relevantStandards = [
    ...new Set(chunks.map((c) => c.source_name)),
  ].slice(0, 5);

  // 3. Build audit-focused prompt
  const systemPrompt = `You are an IFRS audit specialist. Provide audit guidance based on International Financial Reporting Standards (IFRS) and International Standards on Auditing (ISA).

**AUDIT CONTEXT**:
${context}

**INSTRUCTIONS**:
- Reference specific IFRS/ISA standards using [1], [2] notation
- Provide audit procedures when relevant
- Highlight materiality considerations
- Note any judgment areas or estimates

**SOURCES**:
${citations}`;

  // 4. Generate response
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuery },
    ],
    temperature: 0.2,
  });

  return {
    answer: completion.choices[0].message.content || '',
    relevantStandards,
    citations,
  };
}

// Example usage
async function main() {
  const result = await askIFRSAuditAgent(
    'How should we recognize revenue from a 3-year software subscription contract?',
    ['revenue-recognition', 'ifrs-15']
  );

  console.log('Answer:', result.answer);
  console.log('Relevant Standards:', result.relevantStandards);
  console.log('Citations:', result.citations);
}
```

## Example 3: Multi-Agent RAG with Router

**File**: `apps/gateway/src/agents/agent-router.ts`

```typescript
import { getRAGHelper } from '@prisma-glow/lib';

interface AgentConfig {
  name: string;
  category: string;
  jurisdiction: string;
  systemPrompt: string;
}

const AGENTS: Record<string, AgentConfig> = {
  'rwanda-tax': {
    name: 'Rwanda Tax Agent',
    category: 'TAX',
    jurisdiction: 'RW',
    systemPrompt: 'You are a Rwanda tax compliance specialist...',
  },
  'ifrs-audit': {
    name: 'IFRS Audit Agent',
    category: 'IFRS',
    jurisdiction: 'GLOBAL',
    systemPrompt: 'You are an IFRS audit specialist...',
  },
  'malta-corporate': {
    name: 'Malta Corporate Agent',
    category: 'CORPORATE',
    jurisdiction: 'MT',
    systemPrompt: 'You are a Malta corporate compliance specialist...',
  },
};

export async function routeQuery(
  agentId: string,
  userQuery: string
): Promise<string> {
  const agent = AGENTS[agentId];
  if (!agent) throw new Error(`Unknown agent: ${agentId}`);

  const rag = getRAGHelper();

  // Search knowledge base with agent-specific filters
  const { context, citations } = await rag.query({
    query: userQuery,
    category: agent.category,
    jurisdiction: agent.jurisdiction,
    limit: 10,
  });

  // Build prompt with RAG context
  const systemPrompt = `${agent.systemPrompt}

**KNOWLEDGE BASE**:
${context}

**SOURCES**:
${citations}`;

  // Call OpenAI (implement your LLM call here)
  // ...

  return 'Agent response';
}
```

## Example 4: Streaming RAG Response

For better UX, stream the LLM response:

```typescript
import { getRAGHelper } from '@prisma-glow/lib';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const rag = getRAGHelper();

export async function* streamRAGResponse(
  userQuery: string,
  category: string,
  jurisdiction: string
) {
  // 1. Get RAG context (non-streaming)
  const { context, citations } = await rag.query({
    query: userQuery,
    category,
    jurisdiction,
    limit: 10,
  });

  // Yield RAG metadata first
  yield {
    type: 'rag_context',
    citations,
  };

  // 2. Stream LLM response
  const stream = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content: `Use this context:\n\n${context}\n\nCitations:\n${citations}`,
      },
      { role: 'user', content: userQuery },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield {
        type: 'content',
        content,
      };
    }
  }
}

// Usage in Express endpoint
app.get('/api/agent/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const stream = streamRAGResponse(
    req.query.query as string,
    'TAX',
    'RW'
  );

  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }

  res.end();
});
```

## Testing RAG Integration

**File**: `tests/rag-integration.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { getRAGHelper } from '@prisma-glow/lib';

describe('RAG Integration', () => {
  const rag = getRAGHelper();

  it('should search Rwanda tax knowledge', async () => {
    const results = await rag.searchKnowledge({
      query: 'VAT rate',
      category: 'TAX',
      jurisdiction: 'RW',
      limit: 5,
    });

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('content');
    expect(results[0]).toHaveProperty('similarity');
  });

  it('should build context from chunks', () => {
    const mockChunks = [
      {
        chunk_id: 1,
        content: 'VAT in Rwanda is 18%',
        category: 'TAX',
        jurisdiction_code: 'RW',
        tags: [],
        source_name: 'RRA VAT Guide',
        source_url: 'https://rra.gov.rw/vat',
        page_url: 'https://rra.gov.rw/vat',
        similarity: 0.95,
      },
    ];

    const context = rag.buildContext(mockChunks as any);

    expect(context).toContain('RRA VAT Guide');
    expect(context).toContain('VAT in Rwanda is 18%');
  });

  it('should handle empty results gracefully', async () => {
    const results = await rag.searchKnowledge({
      query: 'nonexistent topic xyz123',
      category: 'TAX',
      jurisdiction: 'RW',
      limit: 5,
    });

    expect(results).toEqual([]);
  });
});
```

## Monitoring RAG Usage

Track RAG usage in your agents:

```typescript
// Track RAG queries
await supabase.from('agent_rag_logs').insert({
  agent_id: 'rwanda-tax',
  user_query: userQuery,
  category: 'TAX',
  jurisdiction: 'RW',
  chunks_returned: chunks.length,
  avg_similarity: chunks.reduce((sum, c) => sum + c.similarity, 0) / chunks.length,
  llm_model: 'gpt-4-turbo',
  response_time_ms: Date.now() - startTime,
});
```

## Best Practices

### 1. **Always Filter by Category/Jurisdiction**
```typescript
// Good ✅
const { context } = await rag.query({
  query: 'VAT rate',
  category: 'TAX',
  jurisdiction: 'RW',
});

// Bad ❌ - too broad, may return irrelevant results
const { context } = await rag.query({
  query: 'VAT rate',
});
```

### 2. **Use Low Temperature for Factual Responses**
```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4-turbo',
  messages: [...],
  temperature: 0.1, // Low temp for tax/audit agents
});
```

### 3. **Always Cite Sources**
```typescript
const systemPrompt = `...
Always cite sources using [1], [2] notation.
Never make claims without a citation.
`;
```

### 4. **Handle "No Information" Cases**
```typescript
if (chunks.length === 0 || chunks[0].similarity < 0.5) {
  return "I don't have enough information in my knowledge base to answer this question.";
}
```

### 5. **Cache Embeddings for Repeated Queries**
```typescript
const embeddingCache = new Map<string, number[]>();

async function embedWithCache(query: string): Promise<number[]> {
  if (embeddingCache.has(query)) {
    return embeddingCache.get(query)!;
  }

  const embedding = await rag.embedQuery(query);
  embeddingCache.set(query, embedding);
  return embedding;
}
```

## Next Steps

1. ✅ Create `packages/lib/src/rag-helper.ts`
2. ✅ Update Rwanda Tax Agent to use RAG
3. ✅ Update IFRS Audit Agent to use RAG
4. ✅ Add RAG monitoring/logging
5. ✅ Write integration tests
6. ✅ Deploy and monitor usage

## Related Documentation

- [RAG Ingestion Pipeline README](../RAG_INGESTION_PIPELINE_README.md)
- [Agent Learning System](../AGENT_LEARNING_COMPLETE.md)
- [Knowledge Web Sources](../KNOWLEDGE_WEB_SOURCES_COMPLETE.md)
