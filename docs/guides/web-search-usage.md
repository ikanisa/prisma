# Web Search Module - Usage Guide

The `@prisma-glow/lib` package provides comprehensive support for OpenAI's web search functionality through the Responses API. This guide shows how to use the web search module in your application.

## Installation

The web search module is part of the `@prisma-glow/lib` package:

```typescript
import { runWebSearch, createWebSearchTool, extractWebSearchResults } from '@prisma-glow/lib';
```

## Quick Start

### Basic Web Search

The simplest way to perform a web search:

```typescript
import { getOpenAIClient } from '@prisma-glow/lib/openai/client';
import { runWebSearch } from '@prisma-glow/lib/openai/web-search';

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

## Advanced Usage

### Domain Filtering

Limit search results to specific trusted domains (up to 20):

```typescript
const results = await runWebSearch({
  client,
  query: 'diabetes treatment research',
  model: 'gpt-5',
  allowedDomains: [
    'pubmed.ncbi.nlm.nih.gov',
    'clinicaltrials.gov',
    'www.who.int',
    'www.cdc.gov',
    'www.fda.gov',
  ],
  includeSources: true,
});
```

**Note**: Domains should be specified without `http://` or `https://` prefix. The module automatically normalizes domains.

### Geographic Customization

Customize search results based on user location:

```typescript
const results = await runWebSearch({
  client,
  query: 'What are the best restaurants near me?',
  model: 'o4-mini',
  userLocation: {
    type: 'approximate',
    country: 'GB',
    city: 'London',
    region: 'Greater London',
    timezone: 'Europe/London',
  },
});
```

### Reasoning Models

Use reasoning models for complex queries that benefit from deeper analysis:

```typescript
const results = await runWebSearch({
  client,
  query: 'Analyze the impact of recent monetary policy on inflation',
  model: 'gpt-5',
  reasoningEffort: 'high',  // 'minimal' | 'low' | 'medium' | 'high'
  verbosity: 'high',         // 'low' | 'medium' | 'high'
});
```

### Cache-Only Mode

Use cached/indexed results without fetching live content:

```typescript
const results = await runWebSearch({
  client,
  query: 'Historical data about company X',
  model: 'gpt-5',
  externalWebAccess: false,  // Use cache-only mode
});
```

### Force Web Search

Ensure the model uses web search (not optional):

```typescript
const results = await runWebSearch({
  client,
  query: 'Current weather in Paris',
  model: 'gpt-5',
  forceWebSearch: true,  // Force the model to use web search
  includeSources: true,   // Include all sources in response
});
```

### Preview Tool Variant

Use the preview tool for testing (ignores `external_web_access`):

```typescript
const results = await runWebSearch({
  client,
  query: 'Test query',
  model: 'gpt-5',
  usePreview: true,  // Use web_search_preview tool
});
```

## Using Tool Builders

For more control, you can build tools manually:

```typescript
import { createWebSearchTool, createUserLocation } from '@prisma-glow/lib/openai/web-search';
import { getOpenAIClient } from '@prisma-glow/lib/openai/client';

const client = getOpenAIClient();

// Create custom tool configuration
const searchTool = createWebSearchTool({
  allowedDomains: ['example.com', 'test.org'],
  userLocation: createUserLocation({
    country: 'US',
    city: 'San Francisco',
  }),
  externalWebAccess: true,
});

// Use with OpenAI client directly
const response = await client.responses.create({
  model: 'gpt-5',
  input: 'Your query here',
  tools: [searchTool as any],
  include: ['web_search_call.action.sources'],
});
```

## Extracting Results

Extract specific components from responses:

```typescript
import {
  extractTextFromWebSearchResponse,
  extractUrlCitations,
  extractWebSearchSources,
  extractWebSearchResults,
} from '@prisma-glow/lib/openai/web-search';

// Get just the text
const text = extractTextFromWebSearchResponse(response);

// Get just the citations
const citations = extractUrlCitations(response);
citations.forEach(citation => {
  console.log(`${citation.url} (${citation.title})`);
  console.log(`  Position: ${citation.start_index}-${citation.end_index}`);
});

// Get just the sources
const sources = extractWebSearchSources(response);
sources.forEach(source => {
  console.log(`Source: ${source.url}`);
  console.log(`  Title: ${source.title}`);
  console.log(`  Type: ${source.type}`);  // 'url' | 'oai-sports' | 'oai-weather' | 'oai-finance'
});

// Get everything at once
const results = extractWebSearchResults(response);
```

## Domain Utilities

Validate and normalize domains:

```typescript
import {
  validateDomainFormat,
  normalizeDomain,
  normalizeAllowedDomains,
} from '@prisma-glow/lib/openai/web-search';

// Validate a domain format
if (validateDomainFormat('example.com')) {
  console.log('Valid domain');
}

// Normalize a single domain (removes protocol, trailing slash)
const normalized = normalizeDomain('https://example.com/');
console.log(normalized);  // 'example.com'

// Normalize array of domains
const domains = ['https://example.com', 'http://test.org/', '  openai.com  '];
const cleaned = normalizeAllowedDomains(domains);
console.log(cleaned);  // ['example.com', 'test.org', 'openai.com']
```

## Type Definitions

The module exports comprehensive TypeScript types:

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

## Complete Example

Here's a complete example combining multiple features:

```typescript
import { getOpenAIClient } from '@prisma-glow/lib/openai/client';
import { runWebSearch } from '@prisma-glow/lib/openai/web-search';

async function searchFinancialReports(query: string) {
  const client = getOpenAIClient();

  try {
    const results = await runWebSearch({
      client,
      query,
      model: 'gpt-5',
      
      // Limit to trusted financial sources
      allowedDomains: [
        'ifrs.org',
        'fasb.org',
        'sec.gov',
        'iasplus.com',
      ],
      
      // Use reasoning for complex financial queries
      reasoningEffort: 'medium',
      
      // Get detailed responses
      verbosity: 'high',
      
      // Include all sources
      includeSources: true,
      
      // Force web search
      forceWebSearch: true,
    });

    // Display results
    console.log('Answer:', results.answer);
    console.log('\nCitations:');
    results.citations.forEach((citation, i) => {
      console.log(`  ${i + 1}. ${citation.title || citation.url}`);
    });
    
    console.log('\nAll Sources:');
    results.sources.forEach((source, i) => {
      console.log(`  ${i + 1}. ${source.title} - ${source.url}`);
    });

    return results;
  } catch (error) {
    console.error('Search failed:', error);
    throw error;
  }
}

// Usage
await searchFinancialReports('What are the latest changes to IFRS 16?');
```

## Error Handling

The module validates inputs and throws descriptive errors:

```typescript
try {
  await runWebSearch({
    client,
    query: '',  // Empty query
    model: 'gpt-5',
  });
} catch (error) {
  // Error: query is required and must be a non-empty string
}

try {
  await runWebSearch({
    client,
    query: 'test',
    model: 'gpt-5',
    allowedDomains: Array(21).fill('example.com'),  // Too many domains
  });
} catch (error) {
  // Error: allowedDomains cannot exceed 20 entries
}
```

## Best Practices

1. **Always validate user input** before passing to `runWebSearch`
2. **Use domain filtering** when you need results from trusted sources
3. **Choose appropriate reasoning effort** based on query complexity:
   - `minimal`: Simple factual lookups
   - `low`: Standard queries (default)
   - `medium`: Complex analysis
   - `high`: Deep research requiring multiple searches
4. **Enable `includeSources`** when you need to show all consulted URLs
5. **Use cache-only mode** (`externalWebAccess: false`) for historical queries
6. **Handle errors gracefully** - API calls can fail or timeout
7. **Display citations prominently** in your UI (OpenAI requirement)
8. **Respect rate limits** - web search has tiered rate limits

## Limitations

- Web search is not supported in `gpt-5` with minimal reasoning and `gpt-4.1-nano`
- Context window is limited to 128,000 tokens even with larger models
- Maximum of 20 allowed domains
- User location is not supported for deep research models
- Preview tools (`web_search_preview`) ignore `external_web_access` parameter

## See Also

- [OpenAI Web Search Documentation](https://platform.openai.com/docs/guides/web-search)
- [Architecture Decision Record (ADR-002)](../adr/002-web-search-module.md)
- [File Search Module](../../packages/lib/src/openai/file-search.ts) (similar pattern)
