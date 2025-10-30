# OpenAI Retrieval API Guide

This guide covers the OpenAI Retrieval API implementation in Prisma Glow, which enables semantic search over your data using vector stores powered by OpenAI.

## Overview

The Retrieval API allows you to:
- Create and manage vector stores for semantic search
- Upload and organize documents with attributes for filtering
- Perform semantic searches with advanced ranking options
- Use batch operations for efficient bulk processing
- Integrate search results with OpenAI models for synthesized responses

## Configuration

Set the following environment variables to enable the Retrieval API:

```bash
# Option 1: Use an existing vector store
OPENAI_RETRIEVAL_VECTOR_STORE_ID=vs_abc123

# Option 2: Create/locate by name
OPENAI_RETRIEVAL_VECTOR_STORE_NAME="My Vector Store"

# Required for all operations
OPENAI_API_KEY=sk-...
```

## Quick Start

### 1. Create a Vector Store

```python
POST /v1/vector-stores
{
  "name": "Support FAQ",
  "expires_after": {
    "anchor": "last_active_at",
    "days": 7
  }
}
```

Response:
```json
{
  "id": "vs_abc123",
  "name": "Support FAQ",
  "file_counts": {
    "total": 0,
    "in_progress": 0,
    "completed": 0,
    "failed": 0,
    "cancelled": 0
  },
  "created_at": 1234567890,
  "expires_after": {
    "anchor": "last_active_at",
    "days": 7
  }
}
```

### 2. Upload Files

Use the existing RAG ingest endpoint which automatically uploads to both pgvector and the OpenAI vector store:

```bash
curl -X POST http://localhost:8000/v1/rag/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@customer_policies.pdf" \
  -F "orgSlug=my-org"
```

Or attach an existing file to a vector store:

```python
POST /v1/vector-stores/vs_abc123/files
{
  "file_id": "file-abc123",
  "attributes": {
    "region": "US",
    "category": "Marketing",
    "date": 1672531200
  },
  "chunking_strategy": {
    "type": "static",
    "max_chunk_size_tokens": 1200,
    "chunk_overlap_tokens": 200
  }
}
```

### 3. Search with Semantic Similarity

```python
POST /v1/vector-stores/vs_abc123/search
{
  "query": "What is the return policy?",
  "max_num_results": 10,
  "rewrite_query": true,
  "attribute_filter": {
    "type": "eq",
    "key": "region",
    "value": "US"
  },
  "ranking_options": {
    "ranker": "auto",
    "score_threshold": 0.6
  }
}
```

Response:
```json
{
  "object": "vector_store.search_results.page",
  "search_query": "return policy details",
  "data": [
    {
      "file_id": "file-123",
      "filename": "customer_policies.pdf",
      "score": 0.85,
      "attributes": {
        "region": "US",
        "category": "Support"
      },
      "content": [
        {
          "type": "text",
          "text": "Our return policy allows returns within 30 days of purchase."
        }
      ]
    }
  ],
  "has_more": false
}
```

## API Endpoints

### Vector Store Management

#### Create Vector Store
```
POST /v1/vector-stores
```

**Request Body:**
```json
{
  "name": "string (required)",
  "file_ids": ["file-1", "file-2"],
  "expires_after": {
    "anchor": "last_active_at",
    "days": 7
  },
  "chunking_strategy": {
    "type": "static",
    "max_chunk_size_tokens": 800,
    "chunk_overlap_tokens": 400
  },
  "metadata": {
    "key": "value"
  }
}
```

#### Retrieve Vector Store
```
GET /v1/vector-stores/{vector_store_id}
```

#### Update Vector Store
```
POST /v1/vector-stores/{vector_store_id}
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "expires_after": {
    "anchor": "last_active_at",
    "days": 14
  },
  "metadata": {
    "updated": "2024-01-01"
  }
}
```

#### Delete Vector Store
```
DELETE /v1/vector-stores/{vector_store_id}
```

#### List Vector Stores
```
GET /v1/vector-stores?limit=20&order=desc&after=cursor&before=cursor
```

### Vector Store File Management

#### Create Vector Store File
```
POST /v1/vector-stores/{vector_store_id}/files
```

**Request Body:**
```json
{
  "file_id": "file-abc123",
  "attributes": {
    "region": "US",
    "category": "Marketing",
    "date": 1672531200
  },
  "chunking_strategy": {
    "type": "static",
    "max_chunk_size_tokens": 1200,
    "chunk_overlap_tokens": 200
  }
}
```

#### Retrieve Vector Store File
```
GET /v1/vector-stores/{vector_store_id}/files/{file_id}
```

#### Update Vector Store File
```
POST /v1/vector-stores/{vector_store_id}/files/{file_id}
```

**Request Body:**
```json
{
  "attributes": {
    "region": "APAC",
    "updated_at": 1672617600
  }
}
```

#### Delete Vector Store File
```
DELETE /v1/vector-stores/{vector_store_id}/files/{file_id}
```

#### List Vector Store Files
```
GET /v1/vector-stores/{vector_store_id}/files?limit=20&order=desc&filter_status=completed
```

### Batch Operations

Batch operations allow you to efficiently process multiple files at once.

#### Create File Batch
```
POST /v1/vector-stores/{vector_store_id}/file-batches
```

**Option 1: Simple file IDs**
```json
{
  "file_ids": ["file-1", "file-2", "file-3"]
}
```

**Option 2: Files with per-file settings**
```json
{
  "files": [
    {
      "file_id": "file-1",
      "attributes": {"department": "finance"}
    },
    {
      "file_id": "file-2",
      "chunking_strategy": {
        "type": "static",
        "max_chunk_size_tokens": 1200,
        "chunk_overlap_tokens": 200
      }
    }
  ]
}
```

#### Retrieve File Batch
```
GET /v1/vector-stores/{vector_store_id}/file-batches/{batch_id}
```

#### Cancel File Batch
```
POST /v1/vector-stores/{vector_store_id}/file-batches/{batch_id}/cancel
```

#### List Files in Batch
```
GET /v1/vector-stores/{vector_store_id}/file-batches/{batch_id}/files?limit=20&order=desc
```

### Enhanced Search

#### Search Vector Store
```
POST /v1/vector-stores/{vector_store_id}/search
```

**Request Body:**
```json
{
  "query": "What are the safety regulations?",
  "max_num_results": 10,
  "rewrite_query": true,
  "attribute_filter": {
    "type": "and",
    "filters": [
      {
        "type": "eq",
        "key": "region",
        "value": "US"
      },
      {
        "type": "gte",
        "key": "date",
        "value": 1672531200
      }
    ]
  },
  "ranking_options": {
    "ranker": "default-2024-08-21",
    "score_threshold": 0.7
  }
}
```

## Semantic Search Features

### Query Rewriting

Enable `rewrite_query: true` to automatically optimize your query for better results:

| Original Query | Rewritten Query |
|----------------|-----------------|
| I'd like to know the height of the main office building. | primary office building height |
| What are the safety regulations for transporting hazardous materials? | safety regulations for hazardous materials |
| How do I file a complaint about a service issue? | service complaint filing process |

### Attribute Filtering

Filter search results based on file attributes before performing semantic search.

**Comparison Operators:**
- `eq` - equals
- `ne` - not equals
- `gt` - greater than
- `gte` - greater than or equal to
- `lt` - less than
- `lte` - less than or equal to
- `in` - in list
- `nin` - not in list

**Example: Filter by region**
```json
{
  "type": "eq",
  "key": "region",
  "value": "us"
}
```

**Example: Filter by date range**
```json
{
  "type": "and",
  "filters": [
    {
      "type": "gte",
      "key": "date",
      "value": 1640995200
    },
    {
      "type": "lte",
      "key": "date",
      "value": 1672531199
    }
  ]
}
```

**Example: Filter by filename**
```json
{
  "type": "in",
  "key": "filename",
  "value": ["policy.pdf", "guidelines.pdf"]
}
```

**Example: Complex filter**
```json
{
  "type": "and",
  "filters": [
    {
      "type": "eq",
      "key": "region",
      "value": "US"
    },
    {
      "type": "or",
      "filters": [
        {
          "type": "eq",
          "key": "category",
          "value": "Marketing"
        },
        {
          "type": "eq",
          "key": "category",
          "value": "Sales"
        }
      ]
    }
  ]
}
```

### Ranking Options

Improve search quality with ranking options:

```json
{
  "ranker": "auto",
  "score_threshold": 0.6
}
```

Options:
- **ranker**: Specifies the ranking algorithm
  - `auto` - Automatically selects the best ranker
  - `default-2024-08-21` - Specific ranker version
- **score_threshold**: Minimum similarity score (0.0-1.0). Higher values return more relevant but fewer results.

## Synthesizing Responses

After performing a search, you can use OpenAI models to synthesize a response based on the results.

**Example workflow using the API endpoint:**

```python
import httpx

# 1. Perform search via API
async with httpx.AsyncClient() as client:
    response = await client.post(
        "http://localhost:8000/v1/vector-stores/vs_abc123/search",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "query": "What is the return policy?",
            "max_num_results": 10
        }
    )
    search_results = response.json()

# 2. Format results
def format_results(results):
    formatted = ""
    for result in results["data"]:
        formatted += f"<result file_id='{result['file_id']}' file_name='{result.get('filename', 'Unknown')}'>"
        for content in result["content"]:
            formatted += f"<content>{content['text']}</content>"
        formatted += "</result>"
    return f"<sources>{formatted}</sources>"

formatted_results = format_results(search_results)

# 3. Synthesize response with OpenAI
completion = await openai_client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "developer",
            "content": "Produce a concise answer to the query based on the provided sources."
        },
        {
            "role": "user",
            "content": f"Sources: {formatted_results}\n\nQuery: 'What is the return policy?'"
        }
    ]
)

print(completion.choices[0].message.content)
# Output: "Our return policy allows returns within 30 days of purchase."
```

## Best Practices

### Attributes

- Each vector_store.file can have up to **16 attribute keys**
- Each key is limited to **256 characters**
- Use attributes for filtering: region, category, date, author, department, etc.

### Expiration Policies

Set expiration policies to minimize storage costs:

```json
{
  "expires_after": {
    "anchor": "last_active_at",
    "days": 7
  }
}
```

When a vector store expires, all associated files are deleted automatically.

### Chunking Strategy

Default values:
- `max_chunk_size_tokens`: 800
- `chunk_overlap_tokens`: 400

Constraints:
- `max_chunk_size_tokens` must be between 100 and 4096
- `chunk_overlap_tokens` must be non-negative and ≤ max_chunk_size_tokens / 2

### Limits

- Maximum file size: **512 MB**
- Maximum tokens per file: **5,000,000**
- Maximum results per search: **50**

## Pricing

**Storage costs:**
- Up to 1 GB (across all stores): **Free**
- Beyond 1 GB: **$0.10/GB/day**

Pricing is based on parsed chunks and their embeddings. Use expiration policies to minimize costs.

## Error Handling

All endpoints return standard HTTP status codes:

- `200` - Success
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `500` - Internal server error
- `503` - Service unavailable (OpenAI Retrieval not configured)

**Example error response:**
```json
{
  "detail": "OpenAI Retrieval not configured"
}
```

## Module Reference

The Python module `server.openai_retrieval` provides the following functions:

### Core Functions

- `is_enabled() -> bool` - Check if Retrieval API is configured
- `reset_cache()` - Reset cached vector store IDs (for testing)

### Vector Store Operations

- `create_vector_store(**kwargs) -> Dict[str, Any]`
- `retrieve_vector_store(vector_store_id) -> Dict[str, Any]`
- `update_vector_store(vector_store_id, **kwargs) -> Dict[str, Any]`
- `delete_vector_store(vector_store_id) -> Dict[str, Any]`
- `list_vector_stores(**kwargs) -> Dict[str, Any]`

### File Operations

- `ingest_document(**kwargs) -> Optional[Dict[str, Any]]` - Upload bytes to vector store
- `create_vector_store_file(vector_store_id, file_id, **kwargs) -> Dict[str, Any]`
- `create_and_poll_vector_store_file(vector_store_id, file_id, **kwargs) -> Dict[str, Any]`
- `retrieve_vector_store_file(vector_store_id, file_id) -> Dict[str, Any]`
- `update_vector_store_file(vector_store_id, file_id, **kwargs) -> Dict[str, Any]`
- `delete_vector_store_file(vector_store_id, file_id) -> Dict[str, Any]`
- `list_vector_store_files(vector_store_id, **kwargs) -> Dict[str, Any]`

### Batch Operations

- `create_file_batch(vector_store_id, **kwargs) -> Dict[str, Any]`
- `create_and_poll_file_batch(vector_store_id, **kwargs) -> Dict[str, Any]`
- `retrieve_file_batch(vector_store_id, batch_id) -> Dict[str, Any]`
- `cancel_file_batch(vector_store_id, batch_id) -> Dict[str, Any]`
- `list_files_in_batch(vector_store_id, batch_id, **kwargs) -> Dict[str, Any]`

### Search Operations

- `search(org_id, query, limit, retrieval_config) -> Dict[str, Any]` - Org-scoped semantic search

## See Also

- [OpenAI Retrieval API Documentation](https://platform.openai.com/docs/guides/retrieval)
- [Vector Stores API Reference](https://platform.openai.com/docs/api-reference/vector-stores)
- [File Search Tool](https://platform.openai.com/docs/assistants/tools/file-search)
