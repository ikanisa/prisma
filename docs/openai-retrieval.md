# OpenAI Retrieval API Guide

The Retrieval API enables semantic search across uploaded documents by managing vector stores and query evaluation. This guide captures setup steps, query options, and tuning levers for engineering teams integrating Retrieval-powered experiences into Prisma.

## Quickstart

1. **Create a vector store** to index one or more files.
   ```python
   from openai import OpenAI
   client = OpenAI()

   vector_store = client.vector_stores.create(
       name="Support FAQ",
   )
   ```

2. **Upload files** and block until ingestion completes.
   ```python
   client.vector_stores.files.upload_and_poll(
       vector_store_id=vector_store.id,
       file=open("customer_policies.txt", "rb"),
   )
   ```

3. **Issue a semantic search query** to retrieve the most relevant chunks.
   ```python
   user_query = "What is the return policy?"

   results = client.vector_stores.search(
       vector_store_id=vector_store.id,
       query=user_query,
   )
   ```

Results include the top chunks (default 10, up to 50 via `max_num_results`) along with similarity scores, source files, and optional metadata attributes.

## Semantic Search Behavior

Semantic similarity uses embeddings to surface results even when few keywords match. For example, the question “When did we go to the moon?” ranks the sentence “The first lunar landing occurred in July of 1969.” higher than snippets that only mention the moon in unrelated contexts. This flexibility makes Retrieval especially effective for knowledge bases that mix structured procedures and narrative policy guidance.

## Query Rewriting

Improve recall by enabling server-side query rewriting. Set `rewrite_query=true` when calling `vector_stores.search`. The response echoes the rewritten string in `search_query`, which can be useful for debugging and analytics.

| Original | Rewritten |
| --- | --- |
| I'd like to know the height of the main office building. | primary office building height |
| What are the safety regulations for transporting hazardous materials? | safety regulations for hazardous materials |
| How do I file a complaint about a service issue? | service complaint filing process |

## Attribute Filtering

Limit results to specific metadata by passing an `attribute_filter`. Filters can be:
- **Comparison filters** using operators such as `eq`, `ne`, `gt`, `lt`, `in`, or `nin`.
- **Compound filters** that combine filters with logical `and` / `or`.

Example filters:

```jsonc
// Restrict to the US region
{
  "type": "eq",
  "key": "region",
  "value": "us"
}
```

```jsonc
// Require a date range between two timestamps
{
  "type": "and",
  "filters": [
    { "type": "gte", "key": "date", "value": 1693526400 },
    { "type": "lte", "key": "date", "value": 1696204800 }
  ]
}
```

## Ranking Options

If result quality is insufficient, set `ranking_options` on the search call:
- `ranker`: choose `auto` or a specific release (for example, `default-2024-08-21`).
- `score_threshold`: float between 0.0 and 1.0 to filter out low-confidence matches.

Raising the score threshold increases precision at the cost of fewer results.

## Vector Stores

Vector stores manage the lifecycle of embedded content. Each vector store contains one or more `vector_store.file` objects that reference uploaded `file` objects. Key operations include:

- **Create a vector store**:
  ```python
  client.vector_stores.create(
      name="Support FAQ",
      file_ids=["file_123"],
  )
  ```
- **Attach files** individually or in batches (`create`, `upload_and_poll`, or `file_batches.create_and_poll`).
- **Set attributes** (up to 16 keys, 256 characters each) for downstream filtering.
- **Define expiration policies** via `expires_after` so that unused stores are cleaned up automatically.

### Chunking

Files are chunked automatically with defaults of `max_chunk_size_tokens=800` and `chunk_overlap_tokens=400`. Override these values by supplying a `chunking_strategy` when adding files. Constraints:

- `max_chunk_size_tokens` must be 100–4096.
- `chunk_overlap_tokens` must be non-negative and no more than half of `max_chunk_size_tokens`.

### Limits & Costs

- Maximum file size: **512 MB** with up to **5,000,000 tokens** per file.
- Storage pricing: **Free** up to 1 GB across all vector stores; **$0.10/GB/day** beyond that.

## Backend Integration in Prisma

- Set `OPENAI_RETRIEVAL_VECTOR_STORE_ID` (or `OPENAI_RETRIEVAL_VECTOR_STORE_NAME`) to enable the managed Retrieval path. When only a name is supplied the backend will create or reuse a store with that name on first use.
- `/v1/rag/ingest` continues to chunk content into Postgres/pgvector and, when Retrieval is enabled, uploads the original PDF to the configured OpenAI vector store with org/document metadata.
- `perform_semantic_search` first queries the Retrieval API, applying the configured citation threshold and filtering by `org_id`. If Retrieval is unavailable or disabled the handler automatically falls back to the local pgvector search.
- API responses now include an optional `openaiVectorStore` payload describing the stored file (useful for debugging ingestion) alongside the existing chunk counts.

## Environment Configuration

Provision the Retrieval secrets alongside the existing OpenAI credentials in every environment:

- **Local / development** – update `.env.development.example` (and local overrides) with either `OPENAI_RETRIEVAL_VECTOR_STORE_ID` or `OPENAI_RETRIEVAL_VECTOR_STORE_NAME` so engineers can exercise the managed search flow.
- **Shared staging** – mirror the same variables in the deployment secrets (hosting platform, Docker Compose, or GitHub Actions) plus the OpenAI API key and optional base URL/organization overrides.
- **Production** – register the vector store identifier in both `FASTAPI` and `services/rag` runtime environments so the FastAPI ingestion endpoint and the Node RAG service upload to the same managed store.

When only a name is configured, the backend will lazily create the vector store on first upload and cache the resulting id. Restart services after rotating the id or name to ensure the cache picks up the new value.

## One-Time Backfill

Existing documents that were previously indexed only in pgvector should be uploaded to the managed store once Retrieval is enabled. Run the helper located at `scripts/operations/backfill_openai_retrieval.py` from the repository root:

```bash
OPENAI_API_KEY=sk-... \
OPENAI_RETRIEVAL_VECTOR_STORE_ID=vs_12345 \
SUPABASE_URL=https://<project>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=service-role-key \
python -m scripts.operations.backfill_openai_retrieval
```

The script paginates through Supabase `documents`, downloads stored PDFs, and calls `openai_retrieval.ingest_document` for each org. It skips archived documents or unsupported mime types and logs progress so operations can monitor the migration. Re-running the backfill is safe: uploads include `document_id` attributes, making it easy to deduplicate or prune from the OpenAI dashboard if required.

## Synthesizing Responses

Combine Retrieval with the Responses API to generate grounded answers:

1. Perform a search and format results for prompting.
2. Call `chat.completions.create` (or Responses API) with the original query plus structured source snippets.

Example snippet:

```python
formatted_results = format_results(results.data)

completion = client.chat.completions.create(
    model="gpt-4.1",
    messages=[
        {
            "role": "developer",
            "content": "Produce a concise answer to the query based on the provided sources.",
        },
        {
            "role": "user",
            "content": f"Sources: {formatted_results}\n\nQuery: '{user_query}'",
        },
    ],
)

print(completion.choices[0].message.content)
```

This pattern keeps responses grounded in retrieved citations while allowing Prisma agents to synthesize helpful answers.

## Supported File Types

Refer to the OpenAI platform documentation for the full list of ingestible file types. Unsupported formats should be converted (for example, to PDF or text) before upload.
