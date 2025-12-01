# OpenAI Responses API Types

TypeScript type definitions for OpenAI's Responses API tools, including Web Search, File Search, and Curated Knowledge Base.

## Overview

This directory contains comprehensive type definitions for working with OpenAI's Responses API tools:

### Web Search (`web-search.ts`)
- Tool configuration types
- Request/response structures
- URL citation and annotation types
- Source metadata types

### File Search (`file-search.ts`)
- Tool configuration types
- Request/response structures
- File citation and annotation types
- Search result types
- Metadata filtering types

### Curated Knowledge Base (`curated-knowledge-base.ts`)
- Knowledge standard types (IFRS, IAS, ISA, GAAP, etc.)
- Verification levels (primary, secondary, tertiary)
- Deep Search source types
- Retrieval guardrail types
- Reasoning trace types
- Agent knowledge access types

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

## File Search Types

### FileSearchTool

Main tool configuration for file search in the Responses API.

```typescript
interface FileSearchTool {
  type: 'file_search';
  vector_store_ids: string[];
  max_num_results?: number;
  filters?: FileSearchFilter;
}
```

### FileSearchFilter

Metadata filter for narrowing search scope.

```typescript
interface FileSearchFilter {
  type: 'eq' | 'in';
  key: string;
  value: string | string[];
}
```

### FileSearchResponse

Response structure including search results, citations, and file references.

```typescript
interface FileSearchResponse {
  id?: string;
  output?: Array<FileSearchCallItem | MessageItemWithFileCitations | Record<string, unknown>>;
  output_text?: string;
  file_search_calls?: FileSearchCallItem[];
  usage?: Record<string, unknown>;
  [key: string]: unknown;
}
```

### FileCitationAnnotation

Inline citation annotation showing which file information was sourced from.

```typescript
interface FileCitationAnnotation {
  type: 'file_citation';
  index: number;
  file_id: string;
  filename: string;
  quote?: string;
}
```

## Usage Examples

### File Search

```typescript
import type {
  FileSearchTool,
  FileSearchFilter,
  FileSearchResponse,
  ExtractedFileSearchResults,
} from './types/file-search.js';

// Create a file search tool configuration
const tool: FileSearchTool = {
  type: 'file_search',
  vector_store_ids: ['vs_abc123'],
  max_num_results: 5,
  filters: {
    type: 'in',
    key: 'category',
    value: ['finance', 'legal'],
  },
};

// Use with OpenAI Responses API
const response: FileSearchResponse = await openai.responses.create({
  model: 'gpt-4.1',
  input: 'What are our compliance policies?',
  tools: [tool],
  include: ['file_search_call.results'],
});
```

## See Also

### Web Search
- [../web-search-utils.ts](../web-search-utils.ts) - Utility functions for web search
- [../../docs/web-search.md](../../docs/web-search.md) - Web search documentation
- [../../docs/examples/WEB_SEARCH_EXAMPLES.md](../../docs/examples/WEB_SEARCH_EXAMPLES.md) - Web search examples

### File Search
- [../file-search-utils.ts](../file-search-utils.ts) - Utility functions for file search
- [../../docs/openai-file-search.md](../../docs/openai-file-search.md) - File search documentation
- [../../docs/examples/FILE_SEARCH_EXAMPLES.md](../../docs/examples/FILE_SEARCH_EXAMPLES.md) - File search examples
- [../../tests/openai-file-search.test.ts](../../tests/openai-file-search.test.ts) - File search test suite
