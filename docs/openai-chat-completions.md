# OpenAI Chat Completions API Playbook

## Overview
The Chat Completions API powers text, multimodal, and tool-driven conversations for workloads that still rely on the legacy `/v1/chat/completions` surface. This document distills the official reference for engineering teams migrating from Responses or maintaining back-compat behaviour in finance services.

Use this playbook to quickly identify the correct endpoint, payload shape, and feature toggles when instrumenting requests from Node.js services, Supabase edge functions, or browser-based agents.

## Endpoint Matrix
| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/chat/completions` | Create a model response for a multi-message conversation. |
| `GET` | `/v1/chat/completions/{completion_id}` | Retrieve a stored chat completion created with `store=true`. |
| `GET` | `/v1/chat/completions/{completion_id}/messages` | List stored conversation messages for a persisted completion. |
| `GET` | `/v1/chat/completions` | List stored chat completions, optionally filtered by metadata or model. |
| `POST` | `/v1/chat/completions/{completion_id}` | Update metadata on a stored completion. |
| `DELETE` | `/v1/chat/completions/{completion_id}` | Delete a stored completion. |

> **Storage prerequisite**: Only completions created with `store=true` are available to the retrieval, listing, and deletion endpoints.

## Creating a Chat Completion

### Required fields
- **`model`** – Identifier for the target model (e.g. `gpt-4o`, `gpt-5`, `o3-mini`).
- **`messages`** – Array of conversation turns. Each turn must specify `role` (`system`, `user`, `assistant`, `tool`) and `content`. Content can mix text, image, or audio blocks depending on model support.

### Core configuration options
| Field | Notes |
| --- | --- |
| `modalities` | Defaults to text. Supply `['text', 'audio']` when using `gpt-4o-audio-preview` to request speech output. |
| `max_completion_tokens` | Preferred control for limiting generated tokens. (Deprecated `max_tokens` is unavailable for o-series reasoning models.) |
| `temperature` / `top_p` | Sampling controls. Adjust one or the other. |
| `frequency_penalty` / `presence_penalty` | Bias generation away from repetition or toward new topics. |
| `response_format` | Enables JSON or schema-constrained outputs. Choose `{type: 'json_schema', json_schema: {...}}` for structured responses. |
| `parallel_tool_calls` | Defaults to `true`. Set `false` to enforce sequential tool invocations. |
| `tool_choice` | Force, disable, or auto-select tool invocation. |
| `metadata` | Attach up to 16 key/value pairs (64/512 char limits). Useful for correlating Supabase telemetry. |
| `reasoning_effort` | (`minimal`/`low`/`medium`/`high`) – available on reasoning models to bound planning cost. |
| `verbosity` | (`low`/`medium`/`high`) – request concise or verbose responses. |
| `web_search_options` | Enable OpenAI-managed web search augmentation when available. |

### Streaming
Set `stream=true` to receive Server-Sent Event (SSE) chunks. Optionally pass `stream_options: { include_usage: true }` to receive a trailing chunk with usage metrics.

### Audio output
Provide an `audio` object when requesting speech generation:
- `voice` (e.g. `"alloy"`)
- `format` (`wav`, `mp3`, `flac`)

## Tooling and Function Calls
Define tools via the `tools` array. Each entry describes a function signature that the model may call. Prefer the `tools` + `tool_choice` interface instead of the deprecated `functions` fields.

When the model elects to call a tool, the response chunk includes a `tool_calls` array with JSON arguments. Your caller must execute the tool, append a `role: 'tool'` message with the result, and continue the conversation loop.

## Predictions (Beta)
Use the `prediction` payload to supply a partial completion that the model can adopt or adjust. This is most effective when regenerating long responses with minor edits (e.g. deterministic document updates).

## Managing Stored Completions
- **Retrieve (`GET /{completion_id}`)** – Returns the full completion object, including `usage` and `choices`.
- **List (`GET /`)** – Paginate through stored completions using `after`, `limit`, and optional metadata filters.
- **Messages (`GET /{completion_id}/messages`)** – Inspect the individual conversation turns captured for an archived completion. Supports pagination and sort order.
- **Update (`POST /{completion_id}`)** – Currently supports metadata updates only.
- **Delete (`DELETE /{completion_id}`)** – Permanently removes the stored completion.

## Response Object Anatomy
Every completion contains:
- `id`, `object`, `created`, `model`, `service_tier`
- `choices[]`
  - `message.role`
  - `message.content`
  - Optional `tool_calls`, `refusal`, `annotations`
  - `finish_reason` and `index`
- `usage`
  - `prompt_tokens`, `completion_tokens`, `total_tokens`
  - Nested breakdowns (cached tokens, reasoning tokens, audio tokens)

When streaming, you receive `chat.completion.chunk` objects with incremental deltas until `finish_reason` is emitted.

## Usage Considerations for Finance Platform
1. **Telemetry** – Continue logging to `openai_debug_events` via `services/rag/openai-debug.ts`. Include `completion_id` when `store=true` is enabled for reconciliation.
2. **Quota tagging** – Align `metadata` payloads with billing tags (`finance_org_id`, `autonomy_session_id`) to support dashboards and audits.
3. **Fallback strategy** – Responses API is the strategic surface; Chat Completions remains for compatibility. Prefer migrating new functionality to Responses unless blocked by tooling.
4. **Testing** – Exercise SSE streaming paths and tool invocation flows with `npm run agents:e2e` before shipping. Capture notes in `CHECKLISTS/AGENT/agent_openai_rollout.md`.

## Example Request (cURL)
```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-5",
    "messages": [
      { "role": "developer", "content": "You are a helpful assistant." },
      { "role": "user", "content": "Hello!" }
    ]
  }'
```

## Platform Proxy Endpoints
Authenticated services can call the RAG service proxy to manage stored Chat Completions without exposing API keys:

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/openai/chat-completions` | Body requires `orgSlug` and a `payload` matching the create schema. Supports both standard responses and `stream=true` SSE streams. Optional `metadata`, `tags`, `quotaTag`, and `requestLogPayload` values are forwarded to debug logging. |
| `GET` | `/api/openai/chat-completions` | Query params support `orgSlug`, `after`, `limit`, and `model`. Returns `{ items, hasMore, nextCursor }`. |
| `GET` | `/api/openai/chat-completions/{id}` | Query param `orgSlug` required. Retrieves a stored completion. |
| `PATCH` | `/api/openai/chat-completions/{id}` | Body must include `orgSlug` (or query) and `metadata` object. Updates stored metadata. |
| `DELETE` | `/api/openai/chat-completions/{id}` | Query param `orgSlug` required. Deletes the stored completion. |
| `GET` | `/api/openai/chat-completions/{id}/messages` | Query params: `orgSlug`, optional `after`, `limit`, `order`. Returns stored conversation messages. |

All routes enforce the existing JWT auth middleware and reuse `logOpenAIDebugEvent`, ensuring Supabase `openai_debug_events` captures request metadata and quota tags.

### Proxy streaming support
`POST /api/openai/chat-completions` now forwards OpenAI streaming responses over Server-Sent Events when `payload.stream=true`.

- **Headers** – The proxy sets `Content-Type: text/event-stream`, `Cache-Control: no-cache`, and `Connection: keep-alive` and flushes immediately.
- **Event payloads** – Each chunk is written as `data: {"type":"chunk","data":<ChatCompletionChunk>}` followed by a blank line. Completion emits `data: {"type":"done"}` and the terminator `data: [DONE]`.
- **Abort semantics** – Disconnecting the client triggers `stream.controller.abort()` on the upstream OpenAI stream.
- **Disconnect handling** – Aborted client connections stop downstream event emission and skip `[DONE]` to avoid dangling listeners while still tearing down the upstream stream.
- **Debug logging** – The final chunk ID is logged to Supabase with `extras.streaming=true`, ensuring continuity with stored completion telemetry.
- **Heartbeat instrumentation** – The proxy emits periodic `: keep-alive <timestamp>` comments to keep connections warm. The cadence defaults to 15 seconds and can be tuned with `CHAT_COMPLETIONS_STREAM_HEARTBEAT_INTERVAL_MS` (set the env var to `0` to disable).
- **Throughput metrics** – Every stream writes a structured `openai.chat_completion_stream_metrics` log containing connection duration, chunk cadence statistics, total payload bytes, heartbeat counts, and termination status to support staging analysis.

Clients should treat the SSE stream as authoritative and ignore `result.body`, which remains `undefined` during streaming calls.

### Client migration plan
1. Roll the proxy (including SSE streaming) to staging and rerun `pnpm vitest run tests/api/openai-chat-completions-endpoints.test.ts` alongside any environment-specific smoke tests. Validate both JSON and streaming responses against the staging OpenAI key.
2. Coordinate with web, Supabase edge, and workflow teams to switch their Chat Completions traffic to `/api/openai/chat-completions`, ensuring each client sets `stream=true` only when it can consume SSE events.
3. Audit staging dashboards and the `openai_debug_events` table for `extras.streaming=true` rows to confirm streamed calls route through the proxy before scheduling the production migration.
4. Monitor staging logs for `openai.chat_completion_stream_metrics` entries to validate connection duration, time-to-first-chunk, cadence, and heartbeat efficacy. Adjust `CHAT_COMPLETIONS_STREAM_HEARTBEAT_INTERVAL_MS` as needed before enabling additional clients.
5. After production cutover, revoke direct OpenAI API usage in service configs and monitor quota tags for 48 hours.

### Testing
- Unit coverage: `pnpm vitest run tests/openai-chat-completions.test.ts`
- Integration coverage: `pnpm vitest run tests/api/openai-chat-completions-endpoints.test.ts`

## Example Response
```json
{
  "id": "chatcmpl-B9MBs8CjcvOU2jLn4n570S5qMJKcT",
  "object": "chat.completion",
  "created": 1741569952,
  "model": "gpt-4.1-2025-04-14",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I assist you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 19,
    "completion_tokens": 10,
    "total_tokens": 29
  },
  "service_tier": "default"
}
```

Keep this guide updated as OpenAI deprecates Chat Completions or introduces new reasoning-model parameters.
