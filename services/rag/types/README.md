# Web Search Types

TypeScript type definitions for OpenAI's Web Search Tool in the Responses API.

## Overview

This file contains comprehensive type definitions for working with OpenAI's web search functionality, including:

- Tool configuration types
- Request/response structures
- Citation and annotation types
- Source metadata types

## Key Types

### WebSearchTool

Main tool configuration for web search in the Responses API.

```typescript
interface WebSearchTool {
  type: 'web_search';
  filters?: WebSearchFilters;
  user_location?: WebSearchUserLocation;
  external_web_access?: boolean;
}
```

### WebSearchUserLocation

Geographic location information for refining search results.

```typescript
interface WebSearchUserLocation {
  type: 'approximate';
  country?: string;     // Two-letter ISO code
  city?: string;        // Free text
  region?: string;      // Free text
  timezone?: string;    // IANA timezone
}
```

### WebSearchResponse

Response structure including search results, citations, and sources.

```typescript
interface WebSearchResponse {
  id?: string;
  output?: Array<WebSearchCallItem | MessageItemWithCitations | Record<string, unknown>>;
  output_text?: string;
  web_search_calls?: WebSearchCallItem[];
  [key: string]: unknown;
}
```

### UrlCitationAnnotation

Inline citation annotation showing where information was sourced.

```typescript
interface UrlCitationAnnotation {
  type: 'url_citation';
  start_index: number;
  end_index: number;
  url: string;
  title?: string;
}
```

## Usage

```typescript
import type {
  WebSearchTool,
  WebSearchUserLocation,
  WebSearchResponse,
  ExtractedWebSearchResults,
} from './types/web-search.js';

// Create a web search tool configuration
const tool: WebSearchTool = {
  type: 'web_search',
  filters: {
    allowed_domains: ['example.com', 'test.org'],
  },
  user_location: {
    type: 'approximate',
    country: 'US',
    city: 'New York',
    timezone: 'America/New_York',
  },
  external_web_access: true,
};

// Use with OpenAI Responses API
const response: WebSearchResponse = await openai.responses.create({
  model: 'gpt-5',
  input: 'Search query',
  tools: [tool],
});
```

## See Also

- [../web-search-utils.ts](../web-search-utils.ts) - Utility functions for working with these types
- [../../docs/WEB_SEARCH.md](../../docs/WEB_SEARCH.md) - Comprehensive documentation
- [../../tests/web-search-utils.test.ts](../../tests/web-search-utils.test.ts) - Test suite
