# OpenAI Web Search Tool Integration

## Overview

This document describes the implementation of OpenAI's Web Search Tool in the Prisma Glow RAG service. The web search functionality allows AI models to access up-to-date information from the internet and provide answers with sourced citations.

## Features

### Types of Web Search

1. **Non-reasoning web search**: Fast, simple lookups where the model passes the query to the web search tool and returns top results
2. **Agentic search with reasoning models**: The model actively manages the search process, can perform multiple searches, analyze results, and decide whether to continue searching
3. **Deep research**: Extended investigations with hundreds of sources, best for in-depth research (runs in background mode)

### Capabilities

- **Domain Filtering**: Limit search results to specific domains (up to 20 allowed)
- **User Location**: Refine results based on geography (country, city, region, timezone)
- **Live Internet Access Control**: Toggle between live content fetching and cached/indexed results
- **Citations**: Inline URL citations with annotations showing exactly where information was sourced
- **Sources**: Complete list of all URLs consulted (more comprehensive than citations)

## Implementation

### Type Definitions

Location: `services/rag/types/web-search.ts`

Comprehensive TypeScript types for:
- `WebSearchTool` - Main tool configuration
- `WebSearchPreviewTool` - Preview variant
- `WebSearchUserLocation` - Geographic location info
- `WebSearchFilters` - Domain filtering config
- `WebSearchResponse` - Response structure with citations
- `UrlCitationAnnotation` - Citation metadata
- And more...

### Utility Functions

Location: `services/rag/web-search-utils.ts`

Helper functions for working with web search:
- `createWebSearchTool()` - Create tool configuration
- `createUserLocation()` - Build location object
- `extractTextFromWebSearchResponse()` - Extract answer text
- `extractUrlCitations()` - Extract inline citations
- `extractWebSearchSourcesFromResponse()` - Extract all sources
- `validateDomainFormat()` - Validate domain formatting
- `normalizeDomain()` - Normalize domain strings

### API Endpoint

Location: `services/rag/index.ts`

Endpoint: `POST /api/agent/domain-tools/web-search`

**Request Body:**
```typescript
{
  orgSlug: string;          // Required: Organization identifier
  agentKey: string;         // Required: Domain agent key
  query: string;            // Required: Search query
  reasoningEffort?: string; // Optional: 'minimal' | 'low' | 'medium' | 'high'
  allowedDomains?: string[]; // Optional: Up to 20 domains (without http/https)
  location?: {              // Optional: User location
    country?: string;       // Two-letter ISO code (e.g., 'US', 'GB')
    city?: string;          // City name
    region?: string;        // State/region name
    timezone?: string;      // IANA timezone (e.g., 'America/Chicago')
  };
  externalWebAccess?: boolean; // Optional: true for live (default), false for cache-only
}
```

**Response:**
```typescript
{
  answer: string;                      // Generated answer text
  citations: Array<{                   // Inline citations
    type: 'url_citation';
    url: string;
    title?: string;
    start_index: number;
    end_index: number;
  }>;
  sources: Array<{                     // All consulted sources
    url: string;
    title?: string;
    type?: string;                     // URL or feed type (oai-sports, etc.)
  }>;
}
```

## Usage Examples

### Basic Web Search

```typescript
const response = await fetch('/api/agent/domain-tools/web-search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orgSlug: 'my-org',
    agentKey: 'auditExecution',
    query: 'What are the latest IFRS amendments?',
  }),
});

const { answer, citations, sources } = await response.json();
```

### With Domain Filtering

```typescript
const response = await fetch('/api/agent/domain-tools/web-search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orgSlug: 'my-org',
    agentKey: 'taxCompliance',
    query: 'Search medical research on diabetes treatment',
    allowedDomains: [
      'pubmed.ncbi.nlm.nih.gov',
      'clinicaltrials.gov',
      'www.who.int',
      'www.cdc.gov',
      'www.fda.gov',
    ],
  }),
});
```

### With User Location

```typescript
const response = await fetch('/api/agent/domain-tools/web-search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orgSlug: 'my-org',
    agentKey: 'advisory',
    query: 'Best restaurants near me',
    location: {
      country: 'GB',
      city: 'London',
      region: 'London',
      timezone: 'Europe/London',
    },
  }),
});
```

### Cache-Only Mode

```typescript
const response = await fetch('/api/agent/domain-tools/web-search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orgSlug: 'my-org',
    agentKey: 'riskAndCompliance',
    query: 'Find sunrise time in Paris today',
    externalWebAccess: false, // Use cached results only
  }),
});
```

### Direct OpenAI API Usage

```typescript
import { createWebSearchTool } from './services/rag/web-search-utils';

const tool = createWebSearchTool({
  allowedDomains: ['example.com', 'test.org'],
  userLocation: {
    type: 'approximate',
    country: 'US',
    city: 'New York',
    timezone: 'America/New_York',
  },
  externalWebAccess: true,
});

const response = await openai.responses.create({
  model: 'gpt-5',
  input: 'What happened today?',
  tools: [tool],
  tool_choice: { type: 'web_search' },
  include: ['web_search_call.action.sources'],
});
```

## Configuration

### Environment Variables

- `OPENAI_WEB_SEARCH_ENABLED` - Enable/disable web search feature
- `AGENT_MODEL` - Default model for agents (default: 'gpt-5-mini')
- `OPENAI_DOMAIN_MODEL` - Model for domain tools (defaults to AGENT_MODEL)

### Model Support

Web search is available in:
- Responses API: `web_search` tool (generally available)
- Responses API: `web_search_preview` tool (preview version)
- Chat Completions API: Specialized models (`gpt-5-search-api`, `gpt-4o-search-preview`, `gpt-4o-mini-search-preview`)

### Limitations

- Not supported in `gpt-5` with minimal reasoning
- Not supported in `gpt-4.1-nano`
- Context window limited to 128,000 tokens (even for larger models)
- Tiered rate limits apply (same as model rate limits)
- Domain filtering limited to 20 domains maximum
- User location not supported for deep research models

## Citation Display Requirements

When displaying web results or information contained in web results to end users, inline citations **must be made clearly visible and clickable** in your user interface.

Example implementation:
```typescript
// Parse citations and make them clickable
citations.forEach(citation => {
  const citedText = answer.substring(citation.start_index, citation.end_index);
  // Replace with clickable link
  const link = `<a href="${citation.url}" title="${citation.title}">${citedText}</a>`;
});
```

## Testing

Location: `tests/web-search-utils.test.ts`

Comprehensive test coverage for:
- Tool creation functions
- Location building
- Text extraction from responses
- Citation extraction
- Source extraction
- Domain validation and normalization

Run tests:
```bash
pnpm test tests/web-search-utils.test.ts
```

## Enhancement Tracking

Updates made to existing code:
1. Added timezone support to user location
2. Added external_web_access parameter support
3. Enhanced citation extraction to handle url_citation annotations
4. Improved source extraction to check both flattened and output array formats
5. Added deduplication for sources

## References

- [OpenAI Web Search Documentation](https://platform.openai.com/docs/guides/web-search)
- [Responses API Documentation](https://platform.openai.com/docs/api-reference/responses)
- Internal: `services/rag/index.ts` (main implementation)
- Internal: `services/rag/types/web-search.ts` (type definitions)
- Internal: `services/rag/web-search-utils.ts` (utility functions)
