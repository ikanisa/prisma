# File Search Tool Integration Guide

File search is a hosted retrieval capability available through the OpenAI Responses API. It allows assistants to search a knowledge base of uploaded files to ground responses in your organization’s content. This guide covers the prerequisites, usage patterns, and customization options for the tool so you can wire it into prisma-glow-15 agents.

## Prerequisites
- Create a vector store that will act as the knowledge base for your agents.
- Upload documents (for example PDFs, Markdown, JSON) into the vector store. Supported encodings include UTF-8, UTF-16, and ASCII.
- Record the `vector_store_id` that you will target from your Responses API calls.

## Basic Usage
```python
from openai import OpenAI

client = OpenAI()

response = client.responses.create(
    model="gpt-4.1",
    input="What is deep research by OpenAI?",
    tools=[{
        "type": "file_search",
        "vector_store_ids": ["<vector_store_id>"]
    }]
)
print(response)
```
When the model invokes `file_search`, the API response contains a `file_search_call` item (with the call id and issued queries) and a `message` item. The message content includes the assistant’s text plus file citations that reference the relevant uploads.

## Tailoring Retrieval
The `file_search` tool accepts optional parameters to control latency, scope, and results:
- `max_num_results`: limit the number of returned matches when you need lower token usage or latency.
- `include=["file_search_call.results"]`: embed the raw search hits in the API response for inspection or downstream processing.
- `filters`: restrict searches to files whose metadata matches a predicate (for example, a category tag). See the retrieval guide for filter syntax.

```python
response = client.responses.create(
    model="gpt-4.1",
    input="What is deep research by OpenAI?",
    tools=[{
        "type": "file_search",
        "vector_store_ids": ["<vector_store_id>"],
        "max_num_results": 2,
        "filters": {
            "type": "in",
            "key": "category",
            "value": ["blog", "announcement"]
        }
    }],
    include=["file_search_call.results"]
)
```

## Response Anatomy
A typical payload contains:
- `file_search_call`: metadata about the tool call (id, query terms, and optionally results).
- `message`: the assistant’s reply with `output_text` entries and `file_citation` annotations. Each citation points to the uploaded file (`file_id`, `filename`) and the character span in the assistant message.

Use this structure to surface provenance to end users or audit logs. For example, displaying citations in the UI helps reviewers verify sources before promotion to production.

## Operational Notes
- Respect organization guardrails: upload only redacted or approved documents.
- Monitor rate limits (100–1000 RPM depending on tier) when orchestrating concurrent agent runs.
- Log tool call ids alongside responses so the operations team can reproduce or debug retrieval behavior.
- When rolling out new knowledge bases, verify the metadata filters in a staging environment before promotion.

## Service Configuration
- Set `OPENAI_FILE_SEARCH_VECTOR_STORE_ID` on the RAG service to the target knowledge base.
- (Optional) Tune `OPENAI_FILE_SEARCH_MODEL`, `OPENAI_FILE_SEARCH_MAX_RESULTS`, and `OPENAI_FILE_SEARCH_FILTERS` to control the retrieval profile.
- `OPENAI_FILE_SEARCH_INCLUDE_RESULTS=true` requests the raw tool hits in the Responses payload so we can inspect scores when debugging.

With these variables present, `/v1/rag/search` and the `rag.search` tool both call the hosted file search before falling back to the local pgvector index. The service still returns the same `{ "results": [...] }` shape and logs a debug event (`scope=rag_file_search`) for every OpenAI call, so dashboards and Supabase audit tables continue to light up with consistent telemetry.

## Environment Rollout Checklist
- **Staging secrets** (GitHub `preview` environment or container runtime):
  - `OPENAI_FILE_SEARCH_VECTOR_STORE_ID=vs_<staging-vector-store>`
  - `OPENAI_FILE_SEARCH_MODEL` (optional override; defaults to `gpt-4.1-mini`).
  - `OPENAI_FILE_SEARCH_MAX_RESULTS` / `OPENAI_FILE_SEARCH_FILTERS` (optional guards for noisy corpora).
  - `OPENAI_FILE_SEARCH_INCLUDE_RESULTS=true` so the debug payload contains raw hits for QA.
- **Production secrets** (GitHub `production` environment and runtime manifests): repeat the same values with the production vector store id.
- Update `.env.production` / deployment manifests for the RAG service so both staging and production containers pick up the new variables during rollout.

### Publishing secrets with the GitHub CLI
Run `pnpm openai:file-search:secrets` to publish the vector store configuration directly to the GitHub
`staging` and `production` environments. The script reads the desired values from environment variables
so credentials never hit disk:

```bash
export STAGING_OPENAI_FILE_SEARCH_VECTOR_STORE_ID=vs_<staging-vector-store>
export STAGING_OPENAI_FILE_SEARCH_MODEL=gpt-4.1-mini
export STAGING_OPENAI_FILE_SEARCH_MAX_RESULTS=8
export STAGING_OPENAI_FILE_SEARCH_INCLUDE_RESULTS=true

export PRODUCTION_OPENAI_FILE_SEARCH_VECTOR_STORE_ID=vs_<production-vector-store>
export PRODUCTION_OPENAI_FILE_SEARCH_MODEL=gpt-4.1-mini
export PRODUCTION_OPENAI_FILE_SEARCH_MAX_RESULTS=6
export PRODUCTION_OPENAI_FILE_SEARCH_INCLUDE_RESULTS=false

pnpm openai:file-search:secrets
```

Provide `STAGING_OPENAI_FILE_SEARCH_FILTERS` / `PRODUCTION_OPENAI_FILE_SEARCH_FILTERS` if you want to
apply metadata filters. The script validates the JSON payload before sending it to GitHub and skips
optional overrides that are not provided.

## First-Run Validation
1. After promoting the change, watch the first several `/v1/rag/search` calls in Supabase `openai_debug_events` (filter by `scope = 'rag_file_search'`). Confirm the `vector_store_id` matches the staging/production value and that the citations reference expected files.
2. If results look noisy, adjust `OPENAI_FILE_SEARCH_FILTERS` (metadata filters) or lower `OPENAI_FILE_SEARCH_MAX_RESULTS`, update the secret, and redeploy.
3. Once citations are stable, disable `OPENAI_FILE_SEARCH_INCLUDE_RESULTS` if you want to reduce payload size; keep it enabled while tuning for richer telemetry.
