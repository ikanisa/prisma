# File Search Tool Examples

Comprehensive examples demonstrating OpenAI's File Search Tool with the Responses API.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Limiting Results](#limiting-results)
- [Including Search Results](#including-search-results)
- [Metadata Filtering](#metadata-filtering)
- [TypeScript Integration](#typescript-integration)
- [Error Handling](#error-handling)
- [Advanced Patterns](#advanced-patterns)

## Basic Usage

### Simple File Search

```typescript
import OpenAI from 'openai';
import { createFileSearchTool } from '@/services/rag/file-search-utils';

const client = new OpenAI();

// Create file search tool
const fileSearchTool = createFileSearchTool({
  vectorStoreIds: ['vs_abc123'],
});

// Make request
const response = await client.responses.create({
  model: 'gpt-4.1',
  input: 'What is deep research by OpenAI?',
  tools: [fileSearchTool],
});

console.log(response.output_text);
```

### Python Example

```python
from openai import OpenAI

client = OpenAI()

response = client.responses.create(
    model="gpt-4.1",
    input="What is deep research by OpenAI?",
    tools=[{
        "type": "file_search",
        "vector_store_ids": ["vs_abc123"]
    }]
)

print(response)
```

## Limiting Results

Control the number of search results to reduce token usage and latency:

```typescript
import { createFileSearchTool } from '@/services/rag/file-search-utils';

const fileSearchTool = createFileSearchTool({
  vectorStoreIds: ['vs_abc123'],
  maxNumResults: 2, // Limit to 2 results
});

const response = await client.responses.create({
  model: 'gpt-4.1',
  input: 'Summarize our revenue recognition policies',
  tools: [fileSearchTool],
});
```

### Python Example

```python
response = client.responses.create(
    model="gpt-4.1",
    input="What is deep research by OpenAI?",
    tools=[{
        "type": "file_search",
        "vector_store_ids": ["vs_abc123"],
        "max_num_results": 2
    }]
)
```

## Including Search Results

Request the raw search results in addition to the generated response:

```typescript
import { 
  createFileSearchTool, 
  extractCompleteFileSearchResults 
} from '@/services/rag/file-search-utils';

const fileSearchTool = createFileSearchTool({
  vectorStoreIds: ['vs_abc123'],
});

const response = await client.responses.create({
  model: 'gpt-4.1',
  input: 'What is deep research by OpenAI?',
  tools: [fileSearchTool],
  include: ['file_search_call.results'], // Request raw results
});

// Extract all information
const results = extractCompleteFileSearchResults(response);
console.log('Answer:', results.answer);
console.log('Citations:', results.citations);
console.log('Raw Results:', results.results);
```

### Python Example

```python
response = client.responses.create(
    model="gpt-4.1",
    input="What is deep research by OpenAI?",
    tools=[{
        "type": "file_search",
        "vector_store_ids": ["vs_abc123"]
    }],
    include=["file_search_call.results"]
)
```

## Metadata Filtering

Filter search results based on file metadata:

### Filtering by Category (Multiple Values)

```typescript
import { createFileSearchTool, createFileSearchFilter } from '@/services/rag/file-search-utils';

const filter = createFileSearchFilter('in', 'category', ['blog', 'announcement']);

const fileSearchTool = createFileSearchTool({
  vectorStoreIds: ['vs_abc123'],
  filters: filter,
});

const response = await client.responses.create({
  model: 'gpt-4.1',
  input: 'What are the latest product announcements?',
  tools: [fileSearchTool],
});
```

### Filtering by Exact Match

```typescript
const filter = createFileSearchFilter('eq', 'department', 'finance');

const fileSearchTool = createFileSearchTool({
  vectorStoreIds: ['vs_abc123'],
  filters: filter,
  maxNumResults: 5,
});

const response = await client.responses.create({
  model: 'gpt-4.1',
  input: 'What are our Q4 revenue projections?',
  tools: [fileSearchTool],
  include: ['file_search_call.results'],
});
```

### Python Example

```python
response = client.responses.create(
    model="gpt-4.1",
    input="What is deep research by OpenAI?",
    tools=[{
        "type": "file_search",
        "vector_store_ids": ["vs_abc123"],
        "filters": {
            "type": "in",
            "key": "category",
            "value": ["blog", "announcement"]
        }
    }]
)
```

## TypeScript Integration

### Full Type Safety

```typescript
import type {
  FileSearchTool,
  FileSearchRequestPayload,
  FileSearchResponse,
  ExtractedFileSearchResults,
} from '@/services/rag/types/file-search';
import {
  createFileSearchTool,
  extractCompleteFileSearchResults,
  validateVectorStoreId,
} from '@/services/rag/file-search-utils';

async function performFileSearch(
  vectorStoreId: string,
  query: string
): Promise<ExtractedFileSearchResults> {
  // Validate vector store ID
  if (!validateVectorStoreId(vectorStoreId)) {
    throw new Error('Invalid vector store ID format');
  }

  // Create tool configuration
  const tool: FileSearchTool = createFileSearchTool({
    vectorStoreIds: [vectorStoreId],
    maxNumResults: 5,
  });

  // Build request payload
  const payload: FileSearchRequestPayload = {
    model: 'gpt-4.1',
    input: query,
    tools: [tool],
    include: ['file_search_call.results'],
  };

  // Make request
  const response = (await client.responses.create(payload)) as FileSearchResponse;

  // Extract structured results
  return extractCompleteFileSearchResults(response);
}

// Usage
const results = await performFileSearch('vs_abc123', 'What are our compliance policies?');

console.log('Answer:', results.answer);
console.log('Number of citations:', results.citations.length);
console.log('Number of results:', results.results?.length || 0);
```

### Working with Citations

```typescript
import {
  extractFileCitations,
  groupCitationsByFile,
  sortCitationsByIndex,
  deduplicateCitations,
} from '@/services/rag/file-search-utils';

// Get response with citations
const response = await client.responses.create({
  model: 'gpt-4.1',
  input: 'Summarize our data retention policies',
  tools: [createFileSearchTool({ vectorStoreIds: ['vs_abc123'] })],
});

// Extract and process citations
let citations = extractFileCitations(response);
citations = deduplicateCitations(citations);
citations = sortCitationsByIndex(citations);

// Group by file
const citationsByFile = groupCitationsByFile(citations);

citationsByFile.forEach((fileCitations, fileId) => {
  console.log(`File ${fileId}: ${fileCitations.length} citations`);
  fileCitations.forEach((citation) => {
    console.log(`  - At index ${citation.index}: ${citation.filename}`);
  });
});
```

## Error Handling

### Validation and Error Recovery

```typescript
import {
  validateVectorStoreId,
  validateFileId,
  isSupportedFileFormat,
} from '@/services/rag/file-search-utils';

async function safeFileSearch(
  vectorStoreId: string,
  query: string
): Promise<ExtractedFileSearchResults | null> {
  try {
    // Validate inputs
    if (!validateVectorStoreId(vectorStoreId)) {
      console.error('Invalid vector store ID');
      return null;
    }

    if (!query || query.trim().length === 0) {
      console.error('Query cannot be empty');
      return null;
    }

    // Perform search
    const tool = createFileSearchTool({
      vectorStoreIds: [vectorStoreId],
      maxNumResults: 10,
    });

    const response = await client.responses.create({
      model: 'gpt-4.1',
      input: query,
      tools: [tool],
      include: ['file_search_call.results'],
    });

    return extractCompleteFileSearchResults(response);
  } catch (error) {
    console.error('File search failed:', error);
    return null;
  }
}
```

### Checking File Support

```typescript
const filename = 'document.pdf';

if (isSupportedFileFormat(filename)) {
  console.log(`${filename} is supported for file search`);
} else {
  console.log(`${filename} is not supported`);
}

// Check multiple files
const files = ['report.pdf', 'data.csv', 'notes.md', 'image.png'];
const supportedFiles = files.filter(isSupportedFileFormat);

console.log('Supported files:', supportedFiles);
// Output: Supported files: ['report.pdf', 'notes.md']
```

## Advanced Patterns

### Multi-Vector Store Search

```typescript
// Search across multiple vector stores
const multiStoreSearch = createFileSearchTool({
  vectorStoreIds: ['vs_finance', 'vs_legal', 'vs_hr'],
  maxNumResults: 3,
});

const response = await client.responses.create({
  model: 'gpt-4.1',
  input: 'What are our company policies on remote work?',
  tools: [multiStoreSearch],
});
```

### Combining with Reasoning Models

```typescript
const response = await client.responses.create({
  model: 'gpt-5',
  input: 'Analyze our compliance requirements and suggest improvements',
  tools: [
    createFileSearchTool({
      vectorStoreIds: ['vs_compliance'],
      maxNumResults: 10,
    }),
  ],
  reasoning: {
    effort: 'high', // Use high reasoning effort
  },
});
```

### Search with Response Format

```typescript
import type { FileSearchRequestPayload } from '@/services/rag/types/file-search';

const payload: FileSearchRequestPayload = {
  model: 'gpt-4.1',
  input: 'Extract key financial metrics from Q4 reports',
  tools: [
    createFileSearchTool({
      vectorStoreIds: ['vs_financial_reports'],
      maxNumResults: 5,
      filters: createFileSearchFilter('eq', 'quarter', 'Q4'),
    }),
  ],
  response_format: { type: 'json_object' },
  include: ['file_search_call.results'],
};

const response = await client.responses.create(payload);
```

### Citation Display in UI

```typescript
interface DisplayCitation {
  filename: string;
  fileId: string;
  index: number;
  text: string;
}

function prepareDisplayCitations(
  response: FileSearchResponse,
  text: string
): DisplayCitation[] {
  const citations = extractFileCitations(response);
  const sorted = sortCitationsByIndex(deduplicateCitations(citations));

  return sorted.map((citation, idx) => ({
    filename: citation.filename,
    fileId: citation.file_id,
    index: citation.index,
    text: `[${idx + 1}]`,
  }));
}

// In your UI component
const displayCitations = prepareDisplayCitations(response, answerText);

// Render citations alongside the text
displayCitations.forEach((citation) => {
  console.log(`${citation.text} ${citation.filename}`);
});
```

### Pagination Pattern

```typescript
async function searchWithPagination(
  vectorStoreId: string,
  query: string,
  pageSize: number = 5
): Promise<FileSearchResultItem[]> {
  const tool = createFileSearchTool({
    vectorStoreIds: [vectorStoreId],
    maxNumResults: pageSize,
  });

  const response = await client.responses.create({
    model: 'gpt-4.1',
    input: query,
    tools: [tool],
    include: ['file_search_call.results'],
  });

  return extractFileSearchResults(response);
}

// Get first page
const firstPage = await searchWithPagination('vs_abc123', 'compliance documents', 5);
console.log(`Found ${firstPage.length} results`);
```

## Response Structure Example

Complete response structure with all fields:

```typescript
const response: FileSearchResponse = {
  id: 'resp_abc123',
  output: [
    {
      type: 'file_search_call',
      id: 'fs_67c09ccea8c48191ade9367e3ba71515',
      status: 'completed',
      queries: ['What is deep research?'],
      search_results: [
        {
          id: 'result_1',
          score: 0.95,
          content: 'Deep research is a sophisticated capability...',
          file_id: 'file-2dtbBZdjtDKS8eqWxqbgDi',
          filename: 'deep_research_blog.pdf',
          metadata: {
            category: 'blog',
            date: '2024-01-15',
          },
        },
      ],
    },
    {
      id: 'msg_67c09cd3091c819185af2be5d13d87de',
      type: 'message',
      role: 'assistant',
      status: 'completed',
      content: [
        {
          type: 'output_text',
          text: 'Deep research is a sophisticated capability...',
          annotations: [
            {
              type: 'file_citation',
              index: 992,
              file_id: 'file-2dtbBZdjtDKS8eqWxqbgDi',
              filename: 'deep_research_blog.pdf',
            },
          ],
        },
      ],
    },
  ],
  usage: {
    total_tokens: 1250,
    prompt_tokens: 500,
    completion_tokens: 750,
  },
};
```

## See Also

- [File Search Types Documentation](../types/file-search.ts)
- [File Search Utilities](../file-search-utils.ts)
- [OpenAI File Search Guide](../../docs/openai-file-search.md)
- [Web Search Examples](./WEB_SEARCH_EXAMPLES.md)
