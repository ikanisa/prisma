# Knowledge Base Integration Examples

Comprehensive collection of integration patterns and examples for the Accounting Knowledge Base System.

## 📦 What's Included

This directory contains production-ready integration examples for various frameworks and use cases:

### Integration Files

1. **`nextjs-app-router.tsx`** - Next.js App Router integration
   - Server Components
   - Server Actions
   - Client Components
   - Streaming responses
   - Full TypeScript support

2. **`rest-api-server.ts`** - Express.js REST API
   - Complete REST endpoints
   - Rate limiting
   - CORS support
   - SSE streaming
   - Error handling

3. **`ADVANCED_PATTERNS.md`** - Advanced patterns
   - WebSocket real-time search
   - React custom hooks
   - Multi-agent orchestration
   - Batch processing
   - Caching strategies

---

## 🚀 Quick Start

### Next.js Integration

```bash
# Copy the integration file to your Next.js project
cp nextjs-app-router.tsx app/knowledge/page.tsx

# Install dependencies
npm install @supabase/supabase-js openai
```

**Usage in app/knowledge/search/page.tsx:**

```typescript
import { Suspense } from 'react';
import KnowledgeSearchPage from './page';

export default function Page({ searchParams }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <KnowledgeSearchPage searchParams={searchParams} />
    </Suspense>
  );
}
```

### REST API Server

```bash
# Run the API server
cd scripts/knowledge/integrations
npm install express cors helmet express-rate-limit
npx tsx rest-api-server.ts

# Test the API
curl "http://localhost:3002/api/knowledge/search?q=revenue+recognition"
```

### Custom Hooks

```typescript
import { useKnowledgeSearch, useAccountantAI } from './integrations/ADVANCED_PATTERNS';

function MyComponent() {
  const { results, loading, search } = useKnowledgeSearch();
  const { messages, ask } = useAccountantAI();

  // Use the hooks...
}
```

---

## 📚 Integration Patterns

### 1. Next.js App Router (Server Components)

**Best for:** SEO-optimized pages, initial data fetching

```typescript
// app/knowledge/page.tsx
export default async function KnowledgePage({ searchParams }) {
  const results = await searchKnowledge(searchParams.q);
  return <SearchResults results={results} />;
}
```

**Features:**
- ✅ Server-side rendering
- ✅ Automatic caching
- ✅ SEO friendly
- ✅ Fast initial load

### 2. Next.js Server Actions

**Best for:** Form submissions, mutations, client-server interactions

```typescript
'use server'

export async function searchAction(formData: FormData) {
  const query = formData.get('q');
  const results = await agent.search({ query });
  return results;
}
```

**Features:**
- ✅ Type-safe
- ✅ No API routes needed
- ✅ Automatic revalidation
- ✅ Progressive enhancement

### 3. REST API

**Best for:** Third-party integrations, mobile apps, microservices

```bash
# Search
GET /api/knowledge/search?q=revenue&jurisdiction=RW

# Ask AI
POST /api/knowledge/ask
{
  "question": "How to recognize revenue?",
  "jurisdiction": "RW"
}

# Stream response
POST /api/knowledge/ask/stream
Content-Type: text/event-stream
```

**Features:**
- ✅ Standard HTTP
- ✅ Language agnostic
- ✅ Easy to document
- ✅ Rate limiting included

### 4. WebSocket Real-Time

**Best for:** Collaborative features, live search, instant feedback

```typescript
const { search, connected } = useKnowledgeWebSocket();

await search('revenue recognition');
```

**Features:**
- ✅ Real-time updates
- ✅ Bidirectional
- ✅ Low latency
- ✅ Connection pooling

### 5. React Hooks

**Best for:** Reusable logic, state management, DRY code

```typescript
const { results, loading, error, search } = useKnowledgeSearch();
const { messages, ask, clear } = useAccountantAI();
```

**Features:**
- ✅ Reusable
- ✅ Type-safe
- ✅ Built-in state management
- ✅ Error handling included

### 6. Multi-Agent Orchestration

**Best for:** Complex workflows, multi-step reasoning, comparisons

```typescript
const orchestrator = new KnowledgeOrchestrator(config);

// Complex query across multiple domains
await orchestrator.handleComplexQuery(query, jurisdiction);

// Compare across jurisdictions
await orchestrator.compareJurisdictions(topic, ['RW', 'EU', 'US']);

// Compliance checking
await orchestrator.checkCompliance(scenario, jurisdiction);
```

**Features:**
- ✅ Multi-agent coordination
- ✅ Parallel execution
- ✅ Context synthesis
- ✅ Advanced reasoning

---

## 🛠️ Common Use Cases

### Use Case 1: Search Page

**Pattern:** Next.js Server Component + Client Form

```typescript
// Server Component (app/search/page.tsx)
export default async function SearchPage({ searchParams }) {
  const results = searchParams.q 
    ? await searchKnowledge(searchParams.q) 
    : null;
    
  return (
    <>
      <SearchForm />
      {results && <Results data={results} />}
    </>
  );
}

// Client Component (components/SearchForm.tsx)
'use client'
export function SearchForm() {
  return <form action="/search" method="GET">...</form>;
}
```

### Use Case 2: AI Chat Assistant

**Pattern:** Server Action + React Hook

```typescript
// Server Action (actions/ai.ts)
'use server'
export async function askAI(question: string) {
  const results = await agent.search({ query: question });
  const answer = await generateAnswer(results);
  return { answer, citations: results };
}

// Client Component (components/Chat.tsx)
'use client'
export function Chat() {
  const { messages, ask } = useAccountantAI();
  // Render chat UI...
}
```

### Use Case 3: Knowledge Browser

**Pattern:** REST API + React Hooks

```typescript
function KnowledgeBrowser() {
  const { documents, loading } = useKnowledgeDocuments({
    jurisdiction: 'RW',
    type: 'IFRS',
  });

  return (
    <div>
      {documents.map(doc => (
        <DocumentCard key={doc.id} document={doc} />
      ))}
    </div>
  );
}
```

### Use Case 4: Compliance Dashboard

**Pattern:** Multi-Agent Orchestrator

```typescript
async function generateComplianceReport(scenarios: string[]) {
  const orchestrator = new KnowledgeOrchestrator(config);
  
  const results = await Promise.all(
    scenarios.map(scenario =>
      orchestrator.checkCompliance(scenario, 'RW')
    )
  );

  return {
    overall: calculateCompliance(results),
    details: results,
  };
}
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-...

# Optional
KNOWLEDGE_API_PORT=3002
KNOWLEDGE_WS_PORT=3003
REDIS_URL=redis://localhost:6379
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=100  # 100 requests per window
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true
  }
}
```

---

## 📖 API Reference

### DeepSearchAgent Methods

```typescript
// Basic search
await agent.search({
  query: string,
  jurisdictionCode?: string,
  types?: string[],
  topK?: number
});

// With filters
await agent.search({
  query: "revenue recognition",
  jurisdictionCode: "RW",
  types: ["IFRS", "IAS"],
  topK: 10
});
```

### Server Actions

```typescript
// Search
const result = await searchKnowledgeBase(formData);

// Ask AI
const result = await askAccountantAI(formData);

// Get document
const result = await getDocumentDetails(documentId);
```

### REST Endpoints

```bash
# Search
GET /api/knowledge/search?q=query&jurisdiction=RW&topK=10

# Ask (non-streaming)
POST /api/knowledge/ask
Content-Type: application/json
{ "question": "...", "jurisdiction": "RW" }

# Ask (streaming)
POST /api/knowledge/ask/stream
Content-Type: application/json
{ "question": "...", "jurisdiction": "RW" }

# Documents
GET /api/knowledge/documents?jurisdiction=RW&type=IFRS

# Document detail
GET /api/knowledge/documents/:id

# Stats
GET /api/knowledge/stats

# Health
GET /health
```

---

## 🎯 Best Practices

### 1. Error Handling

```typescript
try {
  const results = await agent.search({ query });
} catch (error) {
  if (error instanceof Error) {
    console.error('Search failed:', error.message);
    // Show user-friendly message
  }
}
```

### 2. Loading States

```typescript
const [loading, setLoading] = useState(false);

async function search(query: string) {
  setLoading(true);
  try {
    const results = await agent.search({ query });
    return results;
  } finally {
    setLoading(false);
  }
}
```

### 3. Caching

```typescript
import { cache } from 'react';

export const getCachedSearch = cache(async (query: string) => {
  return await agent.search({ query });
});
```

### 4. Rate Limiting

```typescript
// Client-side debouncing
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback(
  (query) => search(query),
  500
);
```

### 5. Type Safety

```typescript
import { z } from 'zod';

const SearchParamsSchema = z.object({
  query: z.string().min(1),
  jurisdiction: z.string().optional(),
  topK: z.number().min(1).max(100).optional(),
});

type SearchParams = z.infer<typeof SearchParamsSchema>;
```

---

## 🧪 Testing

### Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { searchKnowledgeBase } from './actions';

describe('searchKnowledgeBase', () => {
  it('searches successfully', async () => {
    const formData = new FormData();
    formData.append('query', 'revenue');
    
    const result = await searchKnowledgeBase(formData);
    
    expect(result.success).toBe(true);
    expect(result.results).toBeDefined();
  });
});
```

### Integration Tests

```typescript
import { test, expect } from '@playwright/test';

test('knowledge search works', async ({ page }) => {
  await page.goto('/knowledge/search');
  
  await page.fill('input[name="q"]', 'revenue recognition');
  await page.click('button[type="submit"]');
  
  await expect(page.locator('.search-results')).toBeVisible();
});
```

---

## 📊 Performance Tips

1. **Use Server Components** for initial data fetching
2. **Implement caching** with Redis or React cache
3. **Debounce search inputs** to reduce API calls
4. **Stream responses** for large payloads
5. **Parallel requests** for independent operations
6. **Pagination** for large result sets
7. **Lazy loading** for embedded components

---

## 🔗 Related Documentation

- [Main README](../README.md)
- [Complete Documentation](../README_COMPLETE.md)
- [API Reference](../API_REFERENCE.md)
- [Production Deployment](../PRODUCTION_DEPLOYMENT.md)
- [Master Index](../INDEX.md)

---

## 📝 Examples Directory Structure

```
integrations/
├── README.md                    # This file
├── nextjs-app-router.tsx        # Next.js integration
├── rest-api-server.ts           # Express API server
├── ADVANCED_PATTERNS.md         # Advanced patterns
└── examples/                    # Additional examples (future)
    ├── react-spa.tsx
    ├── vue-composition.ts
    ├── angular-service.ts
    └── mobile-sdk.ts
```

---

## 💡 Need Help?

- Check the [Master Index](../INDEX.md) for navigation
- Read the [Complete Documentation](../README_COMPLETE.md)
- Review [API Reference](../API_REFERENCE.md)
- See [Production Deployment Guide](../PRODUCTION_DEPLOYMENT.md)

---

## 🎉 Ready to Integrate!

All examples are production-ready and fully typed. Copy, adapt, and deploy with confidence!

**Last Updated:** December 1, 2025  
**Version:** 1.1.0
