# File Search Integration Guide

Comprehensive guide for integrating OpenAI's File Search Tool across different parts of the Prisma Glow platform.

## Overview

This guide demonstrates how to use the file search types and utilities across different layers of the application:

1. **RAG Service Layer** (`services/rag/`) - Core types and utilities
2. **Lib Package** (`packages/lib/src/openai/`) - Specialized high-level wrapper
3. **API Routes** (`apps/web/app/api/agent/`) - REST API endpoints

## Architecture

### RAG Service Layer

The RAG service provides foundational types and utilities:

```typescript
// services/rag/types/file-search.ts
export interface FileSearchTool { ... }
export interface FileSearchResponse { ... }
export interface FileCitationAnnotation { ... }

// services/rag/file-search-utils.ts
export function createFileSearchTool(...) { ... }
export function extractFileCitations(...) { ... }
```

### Lib Package Wrapper

The lib package provides a higher-level wrapper for specific use cases:

```typescript
// packages/lib/src/openai/file-search.ts
export async function runOpenAiFileSearch(options: RunOpenAiFileSearchOptions) {
  // Uses JSON response format
  // Returns structured items with citations
}
```

## Usage Examples

### Using RAG Service Types (Direct API Access)

For full control over the Responses API:

```typescript
import OpenAI from 'openai';
import type { FileSearchTool, FileSearchResponse } from '@/services/rag/types/file-search';
import {
  createFileSearchTool,
  extractCompleteFileSearchResults,
} from '@/services/rag/file-search-utils';

const client = new OpenAI();

// Create tool configuration
const tool: FileSearchTool = createFileSearchTool({
  vectorStoreIds: ['vs_abc123'],
  maxNumResults: 5,
  filters: {
    type: 'eq',
    key: 'department',
    value: 'finance',
  },
});

// Make request
const response = (await client.responses.create({
  model: 'gpt-4.1',
  input: 'What are our revenue recognition policies?',
  tools: [tool],
  include: ['file_search_call.results'],
})) as FileSearchResponse;

// Extract results
const results = extractCompleteFileSearchResults(response);
console.log('Answer:', results.answer);
console.log('Citations:', results.citations);
console.log('Raw results:', results.results);
```

### Using Lib Package Wrapper (Structured Results)

For JSON-formatted structured results:

```typescript
import { runOpenAiFileSearch } from '@prisma-glow/lib/openai/file-search';
import OpenAI from 'openai';

const client = new OpenAI();

const result = await runOpenAiFileSearch({
  client,
  query: 'Summarise IFRS revenue recognition updates',
  vectorStoreId: 'vs_abc123',
  model: 'gpt-4.1-mini',
  topK: 5,
  filters: { category: { eq: 'audit' } },
  includeResults: true,
});

// result.items contains structured data
result.items.forEach((item) => {
  console.log('Text:', item.text);
  console.log('Score:', item.score);
  console.log('Citation:', item.citation);
});
```

### Combining Both Approaches

Use RAG types for validation and the lib wrapper for execution:

```typescript
import { runOpenAiFileSearch } from '@prisma-glow/lib/openai/file-search';
import { validateVectorStoreId, isSupportedFileFormat } from '@/services/rag/file-search-utils';
import OpenAI from 'openai';

async function searchWithValidation(
  vectorStoreId: string,
  query: string,
  filename?: string
): Promise<any> {
  // Validate using RAG utilities
  if (!validateVectorStoreId(vectorStoreId)) {
    throw new Error('Invalid vector store ID');
  }

  if (filename && !isSupportedFileFormat(filename)) {
    throw new Error(`Unsupported file format: ${filename}`);
  }

  // Execute using lib wrapper
  const client = new OpenAI();
  return await runOpenAiFileSearch({
    client,
    query,
    vectorStoreId,
    model: 'gpt-4.1-mini',
    topK: 10,
  });
}
```

## API Endpoint Pattern

Create REST endpoints that leverage both layers:

```typescript
// apps/web/app/api/agent/domain-tools/file-search-enhanced/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { runOpenAiFileSearch } from '@prisma-glow/lib/openai/file-search';
import {
  validateVectorStoreId,
  createFileSearchFilter,
  deduplicateCitations,
  sortCitationsByIndex,
} from '@/services/rag/file-search-utils';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vectorStoreId, query, filters, maxResults = 5 } = body;

    // Validate inputs
    if (!validateVectorStoreId(vectorStoreId)) {
      return NextResponse.json(
        { error: 'Invalid vector store ID format' },
        { status: 400 }
      );
    }

    // Build filter if provided
    const searchFilter = filters
      ? createFileSearchFilter(filters.type, filters.key, filters.value)
      : undefined;

    // Execute search using lib wrapper
    const client = new OpenAI();
    const result = await runOpenAiFileSearch({
      client,
      query,
      vectorStoreId,
      model: 'gpt-4.1-mini',
      topK: maxResults,
      filters: searchFilter,
      includeResults: true,
    });

    // Process citations using RAG utilities
    // Convert lib package citations to RAG citation format
    const ragCitations = result.items
      .map((item) => ({
        type: 'file_citation' as const,
        index: 0, // Will be sorted later if needed
        file_id: item.citation.fileId || '',
        filename: item.citation.filename || '',
      }))
      .filter((c) => c.file_id); // Only include valid citations
    
    const processedCitations = sortCitationsByIndex(deduplicateCitations(ragCitations));

    return NextResponse.json({
      items: result.items,
      citations: processedCitations,
      usage: result.usage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

## Service Integration

### RAG Search Service

Integrate file search into the RAG search service:

```typescript
// services/rag/search-orchestrator.ts
import type { FileSearchTool } from './types/file-search';
import {
  createFileSearchTool,
  extractCompleteFileSearchResults,
  validateVectorStoreId,
} from './file-search-utils';
import OpenAI from 'openai';

export class SearchOrchestrator {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI();
  }

  async searchFiles(
    vectorStoreId: string,
    query: string,
    options?: {
      maxResults?: number;
      filters?: any;
    }
  ) {
    if (!validateVectorStoreId(vectorStoreId)) {
      throw new Error('Invalid vector store configuration');
    }

    const tool = createFileSearchTool({
      vectorStoreIds: [vectorStoreId],
      maxNumResults: options?.maxResults,
      filters: options?.filters,
    });

    const response = await this.client.responses.create({
      model: 'gpt-4.1',
      input: query,
      tools: [tool],
      include: ['file_search_call.results'],
    });

    return extractCompleteFileSearchResults(response as any);
  }
}
```

### Domain Agent Integration

Use file search in domain agents:

```typescript
// packages/agents/src/finance-agent.ts
import { runOpenAiFileSearch } from '@prisma-glow/lib/openai/file-search';
import { validateVectorStoreId } from '@/services/rag/file-search-utils';

export class FinanceAgent {
  private vectorStoreId: string;

  constructor(vectorStoreId: string) {
    if (!validateVectorStoreId(vectorStoreId)) {
      throw new Error('Invalid vector store ID for finance agent');
    }
    this.vectorStoreId = vectorStoreId;
  }

  async queryPolicies(query: string) {
    const result = await runOpenAiFileSearch({
      client: this.getClient(),
      query,
      vectorStoreId: this.vectorStoreId,
      model: 'gpt-4.1-mini',
      topK: 5,
      filters: {
        type: 'in',
        key: 'category',
        value: ['policy', 'procedure', 'guideline'],
      },
    });

    return {
      items: result.items,
      summary: result.rawText,
    };
  }

  private getClient() {
    // Return configured OpenAI client
    return new OpenAI();
  }
}
```

## Testing Patterns

### Unit Tests with RAG Types

```typescript
import { describe, expect, it } from 'vitest';
import { createFileSearchTool, validateVectorStoreId } from '@/services/rag/file-search-utils';
import type { FileSearchTool } from '@/services/rag/types/file-search';

describe('File Search Tool Creation', () => {
  it('creates valid tool configuration', () => {
    const tool: FileSearchTool = createFileSearchTool({
      vectorStoreIds: ['vs_test123'],
      maxNumResults: 5,
    });

    expect(tool.type).toBe('file_search');
    expect(tool.vector_store_ids).toEqual(['vs_test123']);
    expect(tool.max_num_results).toBe(5);
  });

  it('validates vector store IDs', () => {
    expect(validateVectorStoreId('vs_valid123')).toBe(true);
    expect(validateVectorStoreId('invalid')).toBe(false);
  });
});
```

### Integration Tests

```typescript
import { describe, expect, it, vi } from 'vitest';
import { runOpenAiFileSearch } from '@prisma-glow/lib/openai/file-search';

describe('File Search Integration', () => {
  it('searches and returns structured results', async () => {
    const mockClient = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output: [
            {
              content: [
                {
                  text: JSON.stringify({
                    results: [
                      {
                        text: 'Revenue guidance',
                        score: 0.95,
                        citation: { file_id: 'file-123', filename: 'ifrs15.pdf' },
                      },
                    ],
                  }),
                },
              ],
            },
          ],
        }),
      },
    };

    const result = await runOpenAiFileSearch({
      client: mockClient as any,
      query: 'IFRS 15',
      vectorStoreId: 'vs_test',
      model: 'gpt-4.1-mini',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].text).toContain('Revenue guidance');
  });
});
```

## Best Practices

### 1. Layer Separation

- Use **RAG types** for API contracts and validation
- Use **lib wrapper** for high-level business logic
- Use **API routes** for HTTP interfaces

### 2. Type Safety

```typescript
// Always import types explicitly
import type { FileSearchTool, FileSearchResponse } from '@/services/rag/types/file-search';

// Use type guards for runtime validation
import { isFileSearchTool } from '@/services/rag/types/file-search';

function processTools(tools: unknown[]): FileSearchTool[] {
  return tools.filter(isFileSearchTool);
}
```

### 3. Error Handling

```typescript
import { validateVectorStoreId } from '@/services/rag/file-search-utils';

async function safeSearch(vectorStoreId: string, query: string) {
  // Validate early
  if (!validateVectorStoreId(vectorStoreId)) {
    throw new Error('Invalid vector store ID');
  }

  try {
    // Perform search
    return await performSearch(vectorStoreId, query);
  } catch (error) {
    // Log and handle gracefully
    console.error('Search failed:', error);
    return { items: [], error: 'Search failed' };
  }
}
```

### 4. Configuration Management

```typescript
// Store vector store IDs in configuration
const CONFIG = {
  FINANCE_VECTOR_STORE: process.env.FINANCE_VECTOR_STORE_ID || 'vs_finance',
  LEGAL_VECTOR_STORE: process.env.LEGAL_VECTOR_STORE_ID || 'vs_legal',
};

// Validate at startup
Object.entries(CONFIG).forEach(([key, value]) => {
  if (!validateVectorStoreId(value)) {
    throw new Error(`Invalid vector store ID for ${key}: ${value}`);
  }
});
```

## Migration from Legacy Code

If you have existing file search code, migrate gradually:

```typescript
// Old approach (less type-safe)
const tool = {
  type: 'file_search',
  vector_store_ids: [vectorStoreId],
  max_num_results: 5,
};

// New approach (type-safe)
import { createFileSearchTool } from '@/services/rag/file-search-utils';
import type { FileSearchTool } from '@/services/rag/types/file-search';

const tool: FileSearchTool = createFileSearchTool({
  vectorStoreIds: [vectorStoreId],
  maxNumResults: 5,
});
```

## See Also

- [File Search Types](../services/rag/types/file-search.ts) - Core type definitions
- [File Search Utilities](../services/rag/file-search-utils.ts) - Helper functions
- [File Search Examples](./FILE_SEARCH_EXAMPLES.md) - Usage examples
- [OpenAI File Search Guide](../docs/openai-file-search.md) - Configuration guide
