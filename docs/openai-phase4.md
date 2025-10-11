# OpenAI Integration – Phase 4 (Streaming Tools & Media Preview)

## Goals
- Surface tool execution events in real time so users can observe intermediate results during an agent run.
- Provide an initial hook for video generation using the Sora 2 Videos API (gated behind feature flags until access is granted).

## Capabilities
| Feature | Description |
| --- | --- |
| Tool Streaming (SSE) | `/api/agent/stream/execute` streams tool start/result events plus the final text response. Frontend playground updated to visualise these events. Controlled by `OPENAI_STREAMING_TOOL_ENABLED`. |
| Video Generation | `/api/agent/media/video` enqueues a Sora video request when `OPENAI_SORA_ENABLED` is true. Response includes the raw job payload from the Videos API. |

## Configuration
| Variable | Description |
| --- | --- |
| `OPENAI_STREAMING_TOOL_ENABLED` | Enables tool-aware streaming endpoint. |
| `OPENAI_SORA_ENABLED` | Enables Sora video route. Requires `OPENAI_SORA_MODEL`/`OPENAI_SORA_ASPECT_RATIO` if defaults differ. |

## Validation
1. Enable `OPENAI_STREAMING_TOOL_ENABLED` (and existing streaming flag) in staging.
2. Open `/agent-chat` and click “Start tool stream” – observe `tool-start` / `tool-result` events when the agent triggers RAG or policy checks.
3. Inspect `openai_debug_events` to ensure each follow-up call with `tool_outputs` is logged.
4. (Optional) Enable `OPENAI_SORA_ENABLED` and call `POST /api/agent/media/video` with a sample prompt. Confirm the Videos API returns a job payload (or an access error if Sora is not yet granted).
5. Log the results in `CHECKLISTS/AGENT/agent_openai_rollout.md`.

## Roadmap
- Integrate streamed tool events into production UI cards (highlight citations as they arrive).
- Attach audio/video streaming to the `/agent/stream/execute` endpoint once Realtime tool execution is supported by OpenAI.
- Automate Sora job polling and evidence archiving once API access is available.
