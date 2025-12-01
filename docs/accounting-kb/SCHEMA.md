# Accounting Knowledge Base - Database Schema Documentation

## Conceptual Model

```
Jurisdiction (Rwanda, EU, US)
    ↓
Knowledge Source (IFRS Foundation, RRA)
    ↓
Knowledge Document (IAS 21, IFRS 15, Rwanda Income Tax Act)
    ↓
Knowledge Chunk (Text segments for RAG)
    ↓
Knowledge Embedding (Vector representations)
```

## Entity Relationship

```
jurisdictions (1) ──→ (N) knowledge_sources
knowledge_sources (1) ──→ (N) knowledge_documents  
knowledge_documents (1) ──→ (N) knowledge_chunks
knowledge_chunks (1) ──→ (1) knowledge_embeddings

ingestion_jobs (1) ──→ (N) ingestion_files
agent_queries_log ──→ (N) knowledge_chunks (via top_chunk_ids array)
```

## Tables

### jurisdictions

Geographic or regulatory zones.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | text | ISO-style code (RW, EU, US, GLOBAL) |
| name | text | Display name (Rwanda, European Union) |
| created_at | timestamptz | Record creation time |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE on `code`

**Sample Data:**
```sql
INSERT INTO jurisdictions (code, name) VALUES
    ('GLOBAL', 'Global / International'),
    ('RW', 'Rwanda'),
    ('US', 'United States'),
    ('EU', 'European Union');
```

---

### knowledge_sources

Authoritative bodies or source systems.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Source name (e.g., "IFRS Foundation") |
| type | text | IFRS, IAS, ISA, GAAP, TAX_LAW, ACCA, CPA, OECD, INTERNAL, OTHER |
| jurisdiction_id | uuid | Foreign key to jurisdictions |
| authority_level | text | PRIMARY, SECONDARY, INTERNAL |
| url | text | Official website |
| description | text | Long description |
| version | text | Version/edition (e.g., "2023") |
| effective_from | date | When this source became effective |
| effective_to | date | When superseded (null if current) |
| created_at | timestamptz | Record creation time |
| updated_at | timestamptz | Last update time |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `jurisdiction_id`
- INDEX on `type`

**Authority Levels:**
- **PRIMARY**: Laws, official standards (IFRS, IAS, tax acts)
- **SECONDARY**: Commentary, guidance (ACCA, professional bodies)
- **INTERNAL**: Firm-specific policies

**Sample Data:**
```sql
INSERT INTO knowledge_sources (name, type, jurisdiction_id, authority_level, url)
VALUES (
    'IFRS Foundation',
    'IFRS',
    (SELECT id FROM jurisdictions WHERE code = 'GLOBAL'),
    'PRIMARY',
    'https://www.ifrs.org'
);
```

---

### knowledge_documents

Individual standards, laws, or guides.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| source_id | uuid | Foreign key to knowledge_sources |
| title | text | Full title (e.g., "IAS 21: Foreign Exchange") |
| code | text | Standard identifier (IAS 21, IFRS 15, RW-VAT-2022) |
| language_code | text | ISO language code (en, fr, rw) |
| status | text | ACTIVE, DEPRECATED, DRAFT |
| version | text | Document version |
| effective_from | date | When this document became effective |
| effective_to | date | When superseded |
| metadata | jsonb | Arbitrary metadata |
| created_at | timestamptz | Record creation time |
| updated_at | timestamptz | Last update time |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `source_id`
- INDEX on `code`
- INDEX on `status`

**Sample Data:**
```sql
INSERT INTO knowledge_documents (source_id, title, code, status)
VALUES (
    '<source_id>',
    'IAS 21: The Effects of Changes in Foreign Exchange Rates',
    'IAS 21',
    'ACTIVE'
);
```

---

### knowledge_chunks

Text segments for RAG retrieval.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| document_id | uuid | Foreign key to knowledge_documents |
| chunk_index | integer | Order within document (0-based) |
| section_path | text | Logical path (e.g., "IAS 21.8-12") |
| heading | text | Section heading |
| content | text | Chunk text content |
| tokens | integer | Approximate token count |
| jurisdiction_override_id | uuid | Override jurisdiction for this chunk |
| effective_from | date | Override effective date |
| effective_to | date | Override end date |
| metadata | jsonb | Arbitrary metadata |
| created_at | timestamptz | Record creation time |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE on `(document_id, chunk_index)`
- INDEX on `document_id`
- GIN INDEX on `to_tsvector('english', section_path)` for full-text search

**Chunking Strategy:**
- Max 1500 characters per chunk
- 200 character overlap between chunks
- Preserve sentence boundaries where possible

---

### knowledge_embeddings

Vector representations for semantic search.

| Column | Type | Description |
|--------|------|-------------|
| id | bigserial | Primary key |
| chunk_id | uuid | Foreign key to knowledge_chunks (UNIQUE) |
| embedding | vector(1536) | Embedding vector |
| created_at | timestamptz | Record creation time |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE on `chunk_id`
- IVFFlat INDEX on `embedding` for fast similarity search

**Vector Dimensions:**
- 1536 for `text-embedding-3-small`
- 3072 for `text-embedding-3-large`
- Update schema and index if changing models

**Similarity Search:**
```sql
-- Cosine similarity (1 = identical, 0 = orthogonal)
SELECT 1 - (embedding <=> $query_vector::vector) as similarity
FROM knowledge_embeddings
ORDER BY embedding <=> $query_vector::vector
LIMIT 10;
```

---

### ingestion_jobs

Track ingestion pipeline runs.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| source_id | uuid | Foreign key to knowledge_sources |
| status | text | PENDING, RUNNING, COMPLETED, FAILED |
| started_at | timestamptz | When job started |
| finished_at | timestamptz | When job finished |
| stats | jsonb | Job statistics (files, chunks, tokens) |
| error_message | text | Error details if failed |
| created_at | timestamptz | Record creation time |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `(status, created_at DESC)`

**Sample Stats:**
```json
{
  "files": 10,
  "chunks": 230,
  "tokens": 120000,
  "duration_seconds": 145
}
```

---

### ingestion_files

Individual files processed during ingestion.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| job_id | uuid | Foreign key to ingestion_jobs |
| uri | text | Source URI (URL or file path) |
| status | text | PENDING, DOWNLOADING, PARSING, CHUNKING, EMBEDDING, COMPLETED, FAILED |
| page_count | integer | Number of pages (for PDFs) |
| metadata | jsonb | File metadata |
| error_message | text | Error details if failed |
| created_at | timestamptz | Record creation time |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `job_id`
- INDEX on `status`

---

### agent_queries_log

Audit trail of agent queries.

| Column | Type | Description |
|--------|------|-------------|
| id | bigserial | Primary key |
| agent_name | text | Agent that made the query (AccountantAI, DeepSearch) |
| user_id | uuid | User who triggered query (nullable) |
| query_text | text | Original query text |
| response_summary | text | Brief response summary |
| top_chunk_ids | uuid[] | Array of chunk IDs used |
| jurisdiction_id | uuid | Jurisdiction context |
| created_at | timestamptz | Query time |
| latency_ms | integer | Response latency in milliseconds |
| metadata | jsonb | Additional context |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `(agent_name, created_at DESC)`
- INDEX on `(user_id, created_at DESC)`

**Usage Analytics:**
```sql
-- Most queried topics
SELECT query_text, COUNT(*) as count
FROM agent_queries_log
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY query_text
ORDER BY count DESC
LIMIT 20;

-- Average latency by agent
SELECT agent_name, AVG(latency_ms) as avg_latency
FROM agent_queries_log
GROUP BY agent_name;
```

## Data Flow

### Ingestion Pipeline

1. **Create ingestion_job** (status: PENDING)
2. **Create ingestion_files** for each source PDF
3. **Download** (status: DOWNLOADING)
4. **Parse** PDF to text (status: PARSING)
5. **Chunk** text into segments (status: CHUNKING)
6. **Insert** knowledge_chunks
7. **Embed** chunks with OpenAI (status: EMBEDDING)
8. **Insert** knowledge_embeddings
9. **Complete** job (status: COMPLETED)

### Query Pipeline

1. **User query** → AccountantAI
2. **AccountantAI** calls DeepSearch
3. **DeepSearch** embeds query → searches knowledge_embeddings
4. **Retrieve** top K chunks (filtered by jurisdiction/authority)
5. **Rank** by authority_weight × similarity × recency
6. **Log** query to agent_queries_log
7. **Return** chunks with citations
8. **AccountantAI** synthesizes answer

## Maintenance

### Index Tuning

```sql
-- Rebuild IVFFlat index with more lists (for large datasets)
DROP INDEX idx_embeddings_vector;
CREATE INDEX idx_embeddings_vector 
    ON knowledge_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 500);  -- Increase from 100 to 500
```

### Cleanup Old Ingestion Jobs

```sql
DELETE FROM ingestion_jobs
WHERE status = 'COMPLETED'
  AND finished_at < NOW() - INTERVAL '90 days';
```

### Vacuuming

```sql
VACUUM ANALYZE knowledge_embeddings;
VACUUM ANALYZE agent_queries_log;
```

## Performance

- **Chunk count**: ~10,000 chunks
- **Index build time**: ~2 minutes
- **Query latency**: <100ms for top-10 search
- **Embedding time**: ~1s per batch of 50 chunks

## Security

Use Row Level Security (RLS) for multi-tenant setups:

```sql
ALTER TABLE agent_queries_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_queries ON agent_queries_log
    FOR SELECT
    USING (user_id = auth.uid());
```
