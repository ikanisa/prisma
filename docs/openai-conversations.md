# OpenAI Conversations API Reference

The Conversations API provides REST endpoints for creating, reading, updating, and deleting stored conversation state. Conversations persist the history required to make successive calls to the Responses API without resending the full transcript. Each conversation contains ordered items (messages, tool calls, and other structured entries) that can be appended or removed independently of the parent conversation.

## Endpoints

### Create a conversation
- **Method & Path:** `POST /v1/conversations`
- **Description:** Creates a new conversation optionally seeded with up to 20 initial items.
- **Request Body:**
  - `items` *(array, optional)* – Initial conversation items to persist. Each entry must declare a `type`. Supported types include `message`, `response`, `tool_call`, and more as they become available.
  - `metadata` *(object, optional)* – Up to 16 key–value pairs of string metadata (keys ≤ 64 characters, values ≤ 512 characters).
- **Response:** Returns the created conversation object, including its `id`, `metadata`, and `created_at` timestamp.
- **Example:**
  ```bash
  curl https://api.openai.com/v1/conversations \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d '{
      "metadata": {"topic": "demo"},
      "items": [
        {
          "type": "message",
          "role": "user",
          "content": "Hello!"
        }
      ]
    }'
  ```

### Retrieve a conversation
- **Method & Path:** `GET /v1/conversations/{conversation_id}`
- **Description:** Fetches a conversation by identifier.
- **Response:** Returns the conversation object with `id`, `object`, `created_at`, and `metadata`.

### Update a conversation
- **Method & Path:** `POST /v1/conversations/{conversation_id}`
- **Description:** Updates mutable conversation metadata.
- **Request Body:**
  - `metadata` *(object, required)* – Replaces the metadata map on the conversation.
- **Response:** Returns the updated conversation object reflecting the new metadata.

### Delete a conversation
- **Method & Path:** `DELETE /v1/conversations/{conversation_id}`
- **Description:** Deletes the conversation container. Items remain accessible via their own APIs even after the parent conversation is deleted.
- **Response:** Returns a deletion status payload: `{ "id": "...", "object": "conversation.deleted", "deleted": true }`.

## Conversation items
Conversation items capture the ordered events inside a conversation. They can be listed, appended, retrieved, and deleted individually.

### List items
- **Method & Path:** `GET /v1/conversations/{conversation_id}/items`
- **Query Parameters:**
  - `after` *(string, optional)* – Return items after the given `item_id` (useful for pagination).
  - `include` *(array, optional)* – Additional fields to expand in the response. Supported values include:
    - `web_search_call.action.sources`
    - `code_interpreter_call.outputs`
    - `computer_call_output.output.image_url`
    - `file_search_call.results`
    - `message.input_image.image_url`
    - `message.output_text.logprobs`
    - `reasoning.encrypted_content`
  - `limit` *(integer, optional, default 20)* – Maximum number of items to return (1–100).
  - `order` *(string, optional, default `desc`)* – Sort order (`asc` or `desc`).
- **Response:** Returns a list envelope containing `data` (array of items), `first_id`, `last_id`, and `has_more` flags.

### Create items
- **Method & Path:** `POST /v1/conversations/{conversation_id}/items`
- **Description:** Appends up to 20 new items to the specified conversation.
- **Request Body:**
  - `items` *(array, required)* – Items to append. Each item must specify a `type`; message entries must include `role` and `content` blocks.
  - `include` *(array, optional)* – Same include semantics as the list endpoint.
- **Response:** Returns the list envelope containing the newly created items.
- **Example:**
  ```bash
  curl https://api.openai.com/v1/conversations/conv_123/items \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d '{
      "items": [
        {
          "type": "message",
          "role": "user",
          "content": [
            {"type": "input_text", "text": "Hello!"}
          ]
        },
        {
          "type": "message",
          "role": "user",
          "content": [
            {"type": "input_text", "text": "How are you?"}
          ]
        }
      ]
    }'
  ```

### Retrieve an item
- **Method & Path:** `GET /v1/conversations/{conversation_id}/items/{item_id}`
- **Description:** Fetches a single item by `item_id` within a conversation.
- **Query Parameters:** `include` (optional) – Same include semantics as list/create.
- **Response:** Returns the specified conversation item.

### Delete an item
- **Method & Path:** `DELETE /v1/conversations/{conversation_id}/items/{item_id}`
- **Description:** Removes an item from the conversation. Remaining items retain their order.
- **Response:** Returns the parent conversation object (without the deleted item).

## Conversation object schema
- `id` *(string)* – Unique identifier for the conversation.
- `object` *(string)* – Always `conversation`.
- `created_at` *(integer)* – Unix timestamp (seconds) for when the conversation was created.
- `metadata` *(object)* – Up to 16 string key–value pairs for custom annotations.

### Metadata conventions used by the agent
The agent orchestration layer attaches a consistent set of metadata keys so downstream services can filter or audit transcripts:

- `org_id`, `org_slug` – Authoritative organisation linkage.
- `agent_type`, `mode`, `source` – Persona and execution pathway (`plain`, `tools`, `manual`, etc.).
- `user_id`, `engagement_id`, `agent_session_id`, `supabase_run_id` – Supabase correlation identifiers when available.
- `has_context` / `context_present` – Indicates whether contextual text was appended to the user prompt.
- `toolset`, `tool_count` – Comma-separated list and count of tools available during tool-assisted runs.
- `initial_prompt_preview` – Truncated snapshot of the starting user question to power quick search filters.
- `stream_channel`, `question_length`, `context_length` – Diagnostic details about how the conversation was captured.

## Item list envelope schema
- `object` *(string)* – Always `list`.
- `data` *(array)* – Ordered items within the result window.
- `first_id` *(string)* – Identifier of the first item in the response window.
- `last_id` *(string)* – Identifier of the last item in the response window.
- `has_more` *(boolean)* – Indicates whether additional items are available when paginating.

Use the Conversations endpoints to persist stateful interactions when building agents or orchestrating complex workflows around the Responses API.

## Implementation notes
- `services/rag/openai-conversations.ts` wraps the REST endpoints with typed helpers that attach authentication headers, propagate structured logging, and expose utility functions for creating, listing, and managing conversation items.
- `tests/openai-conversations.test.ts` exercises the helper layer, validating URL construction, payload handling, and error propagation for happy paths and failure scenarios.
- `services/rag/agent-conversation-recorder.ts` normalises Responses API payloads, attaches rich metadata (organisation, agent persona, user, engagement, toolset, context flags), and appends messages/tool output back to the Conversations API for both streaming modes.
- `services/rag/index.ts` now persists transcripts for the `/api/agent/stream` (plain SSE) endpoint in addition to `/api/agent/stream/execute`, emitting the `conversation-started` SSE event (including any agent session or Supabase run identifiers) so the UI can fetch transcripts immediately.
- `apps/web/app/agent-chat/page.tsx` exposes pagination (`Load more`) plus filter controls (mode, persona, context, source, owned runs, relative time range, text search) over the stored conversation list, powered by the new query parameters accepted by `GET /api/agent/conversations`.
