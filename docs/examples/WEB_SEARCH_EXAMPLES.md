# Web Search Usage Examples

This document provides practical examples of using the OpenAI Web Search Tool in the Prisma Glow application.

## Basic Examples

### 1. Simple Web Search

```typescript
import { createWebSearchTool } from './services/rag/web-search-utils';

// Create a basic web search tool
const tool = createWebSearchTool();

// Use with OpenAI Responses API
const response = await openai.responses.create({
  model: 'gpt-5',
  input: 'What are the latest developments in AI?',
  tools: [tool],
  tool_choice: { type: 'web_search' },
});

console.log(response.output_text);
```

### 2. Domain-Filtered Search

```typescript
import { createWebSearchTool } from './services/rag/web-search-utils';

// Search only trusted medical sources
const tool = createWebSearchTool({
  allowedDomains: [
    'pubmed.ncbi.nlm.nih.gov',
    'clinicaltrials.gov',
    'www.who.int',
    'www.cdc.gov',
    'www.fda.gov',
  ],
});

const response = await openai.responses.create({
  model: 'gpt-5',
  input: 'What are the latest treatments for diabetes?',
  tools: [tool],
  include: ['web_search_call.action.sources'],
});
```

### 3. Location-Based Search

```typescript
import { createWebSearchTool, createUserLocation } from './services/rag/web-search-utils';

// Create location for London, UK
const location = createUserLocation({
  country: 'GB',
  city: 'London',
  region: 'London',
  timezone: 'Europe/London',
});

const tool = createWebSearchTool({
  userLocation: location,
});

const response = await openai.responses.create({
  model: 'o4-mini',
  input: 'What are the best restaurants near me?',
  tools: [tool],
});
```

### 4. Cache-Only Search

```typescript
import { createWebSearchTool } from './services/rag/web-search-utils';

// Use cached results only (no live web access)
const tool = createWebSearchTool({
  externalWebAccess: false,
});

const response = await openai.responses.create({
  model: 'gpt-5',
  input: 'Find the sunrise time in Paris today',
  tools: [tool],
});
```

## API Endpoint Usage

### 5. Using the RAG Service Endpoint

```typescript
// Client-side request to RAG service
const response = await fetch('/api/agent/domain-tools/web-search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    orgSlug: 'acme-corp',
    agentKey: 'auditExecution',
    query: 'What are the recent changes to ISA 540?',
    reasoningEffort: 'medium',
    allowedDomains: [
      'ifac.org',
      'iaasb.org',
      'aicpa.org',
    ],
    location: {
      country: 'US',
      city: 'New York',
      timezone: 'America/New_York',
    },
    externalWebAccess: true,
  }),
});

const { answer, citations, sources } = await response.json();
```

## See Also

- [Web Search Documentation](../WEB_SEARCH.md)
- [Type Definitions](../../services/rag/types/web-search.ts)
- [Utility Functions](../../services/rag/web-search-utils.ts)
