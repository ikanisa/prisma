# OpenAI Web Search Module

Comprehensive TypeScript module for using OpenAI's web search functionality through the Responses API.

## Overview

This module provides type-safe, well-documented functions for performing web searches with OpenAI models including support for:

- Non-reasoning web search (fast lookups)
- Agentic search with reasoning models (complex queries)
- Deep research (hundreds of sources)
- Domain filtering (up to 20 trusted domains)
- Geographic customization (user location)
- Live/cache-only modes
- Citation and source extraction

## Installation

```typescript
import { runWebSearch } from '@prisma-glow/lib/openai/web-search';
import { getOpenAIClient } from '@prisma-glow/lib/openai/client';
```

## Quick Start

```typescript
const client = getOpenAIClient();

const results = await runWebSearch({
  client,
  query: 'What are the latest IFRS amendments?',
  model: 'gpt-5',
});

console.log(results.answer);     // Generated answer with citations
console.log(results.citations);  // Array of URL citations
console.log(results.sources);    // All sources consulted
```

## Key Features

### Domain Filtering

```typescript
const results = await runWebSearch({
  client,
  query: 'diabetes treatment research',
  model: 'gpt-5',
  allowedDomains: [
    'pubmed.ncbi.nlm.nih.gov',
    'clinicaltrials.gov',
    'www.who.int',
  ],
});
```

### User Location

```typescript
const results = await runWebSearch({
  client,
  query: 'best restaurants near me',
  model: 'o4-mini',
  userLocation: {
    type: 'approximate',
    country: 'GB',
    city: 'London',
  },
});
```

### Reasoning Models

```typescript
const results = await runWebSearch({
  client,
  query: 'complex financial analysis query',
  model: 'gpt-5',
  reasoningEffort: 'high',  // 'minimal' | 'low' | 'medium' | 'high'
});
```

### Cache-Only Mode

```typescript
const results = await runWebSearch({
  client,
  query: 'historical information',
  model: 'gpt-5',
  externalWebAccess: false,  // Use cached results only
});
```

## API Reference

### Main Function

#### `runWebSearch(options: RunWebSearchOptions): Promise<ExtractedWebSearchResults>`

Performs a web search using OpenAI's Responses API.

**Options:**
- `client` - OpenAI client with Responses API support
- `query` - Search query string (required)
- `model` - Model to use (e.g., 'gpt-5', 'o4-mini')
- `allowedDomains` - Array of allowed domains (max 20)
- `userLocation` - Geographic location for results
- `externalWebAccess` - Enable/disable live internet access
- `reasoningEffort` - Reasoning level: 'minimal' | 'low' | 'medium' | 'high'
- `verbosity` - Text verbosity: 'low' | 'medium' | 'high'
- `usePreview` - Use web_search_preview tool variant
- `includeSources` - Include all sources in response
- `forceWebSearch` - Force web search tool usage

**Returns:**
```typescript
interface ExtractedWebSearchResults {
  answer: string;                      // Generated answer text
  citations: UrlCitationAnnotation[];  // Inline citations
  sources: WebSearchSource[];          // All consulted sources
}
```

### Tool Builders

#### `createWebSearchTool(options?): WebSearchTool`

Creates a web_search tool configuration.

#### `createWebSearchPreviewTool(options?): WebSearchPreviewTool`

Creates a web_search_preview tool configuration.

#### `createUserLocation(options): WebSearchUserLocation | undefined`

Creates a user location object for geographic customization.

### Extraction Functions

#### `extractTextFromWebSearchResponse(response): string`

Extracts answer text from API response.

#### `extractUrlCitations(response): UrlCitationAnnotation[]`

Extracts inline URL citations.

#### `extractWebSearchSources(response): WebSearchSource[]`

Extracts all consulted sources.

#### `extractWebSearchResults(response): ExtractedWebSearchResults`

Extracts text, citations, and sources together.

### Domain Utilities

#### `validateDomainFormat(domain): boolean`

Validates domain format (should not include protocol).

#### `normalizeDomain(domain): string`

Normalizes a domain (removes protocol, trailing slash).

#### `normalizeAllowedDomains(domains): string[]`

Normalizes and filters an array of domains.

## Type Definitions

```typescript
import type {
  WebSearchTool,
  WebSearchPreviewTool,
  WebSearchUserLocation,
  WebSearchFilters,
  WebSearchResponse,
  WebSearchSource,
  UrlCitationAnnotation,
  ExtractedWebSearchResults,
  ReasoningEffortLevel,
  VerbosityLevel,
} from '@prisma-glow/lib/openai/web-search';
```

## Documentation

- [Usage Guide](../../../docs/guides/web-search-usage.md) - Comprehensive guide with examples
- [Architecture Decision](../../../docs/adr/002-web-search-module.md) - Design rationale
- [Example Script](../../../examples/web-search-example.ts) - Runnable examples

## Testing

The module includes 51 comprehensive unit tests covering:

- Tool creation and validation
- Response extraction
- Domain normalization
- Error handling
- Edge cases

Run tests:
```bash
pnpm test packages/lib/src/openai/__tests__/web-search.test.ts
```

## Limitations

- Web search is not supported in `gpt-5` with minimal reasoning and `gpt-4.1-nano`
- Context window is limited to 128,000 tokens
- Maximum of 20 allowed domains
- User location is not supported for deep research models
- Preview tools ignore `external_web_access` parameter

## Best Practices

1. Always validate user input before passing to `runWebSearch`
2. Use domain filtering for trusted source requirements
3. Choose appropriate reasoning effort based on query complexity
4. Enable `includeSources` when you need to show all consulted URLs
5. Use cache-only mode for historical queries
6. Handle errors gracefully
7. Display citations prominently in your UI (OpenAI requirement)

## Contributing

When modifying this module:

1. Update type definitions if API changes
2. Add tests for new functionality
3. Update documentation
4. Follow existing code patterns
5. Reference ADR-002 in changes

## License

Part of the Prisma Glow project.
