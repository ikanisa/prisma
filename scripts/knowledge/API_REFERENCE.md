# API Reference - Accounting Knowledge Base System
**Version 1.1.0**

## Overview

The Knowledge Base API provides semantic search over accounting standards (IFRS, IAS, ISA), tax laws, and professional guidance with citation tracking and authority-based ranking.

---

## Base URL

```
Development: http://localhost:3002
Production:  https://knowledge-api.yourdomain.com
```

---

## Authentication

Currently uses environment-based authentication via Supabase service role key.

Future versions will support:
- API key authentication
- JWT tokens
- OAuth 2.0

---

## Endpoints

### 1. Health Check

Check API availability and database connectivity.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-01T18:30:00.000Z",
  "database": "connected",
  "version": "1.1.0"
}
```

**Status Codes:**
- `200 OK` - Service healthy
- `503 Service Unavailable` - Service down

---

### 2. Search Knowledge

Semantic search across all knowledge sources.

**Endpoint:** `POST /api/knowledge/search`

**Request Body:**
```json
{
  "query": "How do I account for foreign exchange gains?",
  "topK": 5,
  "jurisdictions": ["RW", "GLOBAL"],
  "types": ["IFRS", "IAS", "TAX_LAW"],
  "minRelevance": 0.75
}
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| query | string | Yes | - | Search query text |
| topK | number | No | 5 | Number of results to return |
| jurisdictions | string[] | No | ["GLOBAL"] | Filter by jurisdiction codes |
| types | string[] | No | null | Filter by source types |
| minRelevance | number | No | 0.7 | Minimum similarity threshold |

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "chunkId": "uuid",
      "documentCode": "IAS 21",
      "title": "The Effects of Changes in Foreign Exchange Rates",
      "sectionPath": "IAS 21.28-32",
      "content": "Exchange differences arising on...",
      "relevanceScore": 0.89,
      "sourceUrl": "https://www.ifrs.org/...",
      "authorityLevel": "PRIMARY",
      "jurisdiction": "GLOBAL",
      "type": "IAS"
    }
  ],
  "metadata": {
    "totalResults": 15,
    "avgRelevance": 0.82,
    "latencyMs": 450,
    "sources": ["IAS 21", "IFRS 9"]
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid parameters
- `500 Internal Server Error` - Server error

---

### 3. Get Statistics

Retrieve system statistics.

**Endpoint:** `GET /api/knowledge/stats`

**Response:**
```json
{
  "success": true,
  "stats": {
    "sources": 10,
    "documents": 10,
    "chunks": 487,
    "embeddings": 487,
    "totalQueries": 1523,
    "queriesToday": 45,
    "avgLatencyMs": 420,
    "lastIngestion": "2025-12-01T10:00:00.000Z"
  }
}
```

---

### 4. List Sources

Get all knowledge sources.

**Endpoint:** `GET /api/knowledge/sources`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| type | string | No | null | Filter by type (IFRS, IAS, TAX_LAW, etc.) |
| jurisdiction | string | No | null | Filter by jurisdiction code |
| authorityLevel | string | No | null | Filter by authority (PRIMARY, SECONDARY, INTERNAL) |

**Response:**
```json
{
  "success": true,
  "sources": [
    {
      "id": "uuid",
      "name": "IFRS Foundation - IAS 21",
      "type": "IAS",
      "jurisdiction": "GLOBAL",
      "authorityLevel": "PRIMARY",
      "documentCount": 1,
      "chunkCount": 45,
      "updatedAt": "2025-12-01T10:00:00.000Z"
    }
  ],
  "total": 10
}
```

---

### 5. Get Document

Retrieve a specific document by code or ID.

**Endpoint:** `GET /api/knowledge/documents/:identifier`

**Parameters:**
- `identifier`: Document code (e.g., "IAS 21") or UUID

**Response:**
```json
{
  "success": true,
  "document": {
    "id": "uuid",
    "code": "IAS 21",
    "title": "The Effects of Changes in Foreign Exchange Rates",
    "sourceType": "IAS",
    "jurisdiction": "GLOBAL",
    "authorityLevel": "PRIMARY",
    "status": "ACTIVE",
    "effectiveFrom": "2018-01-01",
    "version": "2023",
    "chunkCount": 45,
    "url": "https://www.ifrs.org/...",
    "updatedAt": "2025-12-01T10:00:00.000Z"
  }
}
```

---

### 6. Deep Search (Agent)

Advanced search using DeepSearch agent with multi-step retrieval.

**Endpoint:** `POST /api/knowledge/deep-search`

**Request Body:**
```json
{
  "query": "How should I treat unrealized foreign exchange gains for tax purposes in Rwanda?",
  "context": {
    "jurisdiction": "RW",
    "entity": "private_company",
    "year": 2024
  },
  "options": {
    "includeSecondary": true,
    "checkExternal": false,
    "maxChunks": 6
  }
}
```

**Response:**
```json
{
  "success": true,
  "answer": "Under Rwandan tax law...",
  "confidence": 0.85,
  "sources": [
    {
      "code": "RW Income Tax Act 2023",
      "section": "Article 42",
      "relevance": 0.92,
      "excerpt": "Unrealized exchange gains shall not be included..."
    },
    {
      "code": "IAS 21",
      "section": "21.28",
      "relevance": 0.85,
      "excerpt": "Exchange differences arising on..."
    }
  ],
  "reasoning": "Primary source is Rwanda Income Tax Act which takes precedence...",
  "warnings": [
    "Tax law effective from January 2023 - verify no recent amendments"
  ],
  "metadata": {
    "agentName": "DeepSearch",
    "processingSteps": 4,
    "latencyMs": 1200,
    "queryId": "uuid"
  }
}
```

---

### 7. Query History

Retrieve query history for analytics.

**Endpoint:** `GET /api/knowledge/queries`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| agent | string | No | null | Filter by agent name |
| from | ISO date | No | 7 days ago | Start date |
| to | ISO date | No | now | End date |
| limit | number | No | 100 | Max results |
| offset | number | No | 0 | Pagination offset |

**Response:**
```json
{
  "success": true,
  "queries": [
    {
      "id": "bigint",
      "agentName": "AccountantAI",
      "query": "revenue recognition for software subscriptions",
      "responseSummary": "Under IFRS 15...",
      "topChunkIds": ["uuid1", "uuid2"],
      "jurisdiction": "GLOBAL",
      "createdAt": "2025-12-01T15:30:00.000Z",
      "latencyMs": 450
    }
  ],
  "pagination": {
    "total": 1523,
    "limit": 100,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### 8. Freshness Check

Check for stale documents that may need updating.

**Endpoint:** `GET /api/knowledge/freshness`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| threshold | number | No | 180 | Days before considering stale |

**Response:**
```json
{
  "success": true,
  "staleDocuments": [
    {
      "code": "IAS 12",
      "title": "Income Taxes",
      "daysSinceUpdate": 245,
      "lastUpdate": "2024-04-01T00:00:00.000Z",
      "recommendation": "Check for amendments"
    }
  ],
  "summary": {
    "total": 10,
    "stale": 2,
    "percentage": 20
  }
}
```

---

## TypeScript SDK

### Installation

```bash
npm install @prisma-glow/knowledge-sdk
# or
pnpm add @prisma-glow/knowledge-sdk
```

### Usage

```typescript
import { KnowledgeClient } from '@prisma-glow/knowledge-sdk';

const client = new KnowledgeClient({
  baseUrl: 'https://knowledge-api.yourdomain.com',
  apiKey: process.env.KNOWLEDGE_API_KEY
});

// Simple search
const results = await client.search({
  query: 'foreign exchange accounting',
  topK: 5,
  jurisdictions: ['RW']
});

console.log(results.results);

// Deep search with agent
const answer = await client.deepSearch({
  query: 'How do I recognize revenue for SaaS?',
  context: { jurisdiction: 'RW' }
});

console.log(answer.answer);
console.log(answer.sources);

// Get statistics
const stats = await client.getStats();
console.log(stats);
```

---

## Direct Database Access

For advanced use cases, you can query the database directly.

### Schema

```sql
-- Core tables
jurisdictions
knowledge_sources
knowledge_documents
knowledge_chunks
knowledge_embeddings

-- Tracking
ingestion_jobs
ingestion_files
agent_queries_log
```

### Example Queries

**Find documents by type:**
```sql
SELECT 
  kd.code,
  kd.title,
  ks.type,
  j.code as jurisdiction
FROM knowledge_documents kd
JOIN knowledge_sources ks ON ks.id = kd.source_id
JOIN jurisdictions j ON j.id = ks.jurisdiction_id
WHERE ks.type = 'IFRS'
  AND kd.status = 'ACTIVE';
```

**Semantic search:**
```sql
SELECT 
  kc.id,
  kc.content,
  kd.code,
  kd.title,
  1 - (ke.embedding <=> $1::vector) as similarity
FROM knowledge_embeddings ke
JOIN knowledge_chunks kc ON kc.id = ke.chunk_id
JOIN knowledge_documents kd ON kd.id = kc.document_id
WHERE kd.status = 'ACTIVE'
ORDER BY ke.embedding <=> $1::vector
LIMIT 10;
```

**Query analytics:**
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as queries,
  AVG(latency_ms) as avg_latency
FROM agent_queries_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | BAD_REQUEST | Invalid request parameters |
| 401 | UNAUTHORIZED | Missing or invalid authentication |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
| 503 | SERVICE_UNAVAILABLE | Service temporarily down |

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid query parameter: topK must be between 1 and 50",
    "details": {
      "field": "topK",
      "value": 100,
      "expected": "1-50"
    }
  }
}
```

---

## Rate Limits

Default rate limits:
- **Anonymous**: 10 requests/minute
- **Authenticated**: 100 requests/minute
- **Enterprise**: 1000 requests/minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1701450000
```

---

## Webhooks (Coming Soon)

Subscribe to events:
- `document.updated` - Document was updated
- `source.added` - New source added
- `query.completed` - Query was processed

---

## Best Practices

### 1. Caching
Cache results for common queries to reduce latency and costs.

```typescript
const cache = new Map();

async function searchWithCache(query: string) {
  const cacheKey = `search:${query}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const result = await client.search({ query });
  cache.set(cacheKey, result);
  
  return result;
}
```

### 2. Batch Queries
When possible, batch multiple queries:

```typescript
const queries = [
  'foreign exchange accounting',
  'revenue recognition',
  'lease accounting'
];

const results = await Promise.all(
  queries.map(q => client.search({ query: q }))
);
```

### 3. Use Filters
Narrow searches with jurisdiction and type filters:

```typescript
const results = await client.search({
  query: 'income tax',
  jurisdictions: ['RW'],  // Only Rwanda
  types: ['TAX_LAW'],     // Only tax laws
  minRelevance: 0.8       // High relevance only
});
```

### 4. Monitor Usage
Track query patterns and latency:

```typescript
const startTime = Date.now();
const results = await client.search({ query });
const latency = Date.now() - startTime;

console.log(`Query took ${latency}ms`);
```

---

## Support

- **Documentation**: `/scripts/knowledge/README_COMPLETE.md`
- **API Issues**: Create GitHub issue
- **Feature Requests**: GitHub discussions

---

**API Version**: 1.1.0  
**Last Updated**: December 1, 2025
