# AI Engine Package

AI/ML services for the Prisma platform.

## Modules

| Module | Description |
|--------|-------------|
| `llm-service.ts` | Unified LLM (Claude, GPT, Gemini) with streaming |
| `vector-db.ts` | Vector database (Pinecone/Weaviate) for RAG |

## Usage

```typescript
import { llmService } from '@prisma/ai-engine/services/llm-service';
import { vectorDb } from '@prisma/ai-engine/services/vector-db';

// Generate completion
const response = await llmService.complete({
  model: 'claude-sonnet-4-20250514',
  messages: [{ role: 'user', content: 'Explain nexus rules' }],
});

// Stream response
for await (const chunk of llmService.stream(request)) {
  console.log(chunk.text);
}

// Vector search
const results = await vectorDb.query({
  vector: embedding,
  topK: 10,
  filter: { type: 'audit_procedure' },
});
```

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
PINECONE_API_KEY=...
WEAVIATE_URL=...
```
