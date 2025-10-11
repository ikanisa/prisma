# OpenAI Integration – Phase 2 (Streaming & Realtime Foundations)

## Scope
- Introduces SSE streaming for direct agent conversations using the Responses streaming API.
- Adds ChatKit session scaffolding and realtime session storage so Realtime Calls can connect to the OpenAI Agent Platform.
- Establishes nightly evaluation hooks (placeholder) ahead of Phase 3 red-team automation.

## Key Changes
| Area | Description |
| --- | --- |
| API | `/api/agent/stream` streams partial output via Server-Sent Events when `OPENAI_STREAMING_ENABLED=true`. |
| Frontend | `apps/web/app/agent-chat/page.tsx` now hosts a streaming playground with live event debugging. |
| Observability | Streaming requests still log to `openai_debug_events` through the existing debug logger. |
| Data Model | `chatkit_sessions` table stores realtime session metadata; `agent_sessions`/`agent_runs` remain unchanged. |
| Realtime Gateway | `/api/agent/realtime/session` now requires `agentSessionId`, creates OpenAI Realtime sessions, and persists details for ChatKit restart flows. |
| Documents | New MCP tool `document.vision_ocr` (OpenAI Vision) extracts text from document images for downstream agents. |

## Configuration
| Variable | Description |
| --- | --- |
| `OPENAI_STREAMING_ENABLED` | Enables the new streaming endpoint. |
| `OPENAI_REALTIME_MODEL`, `OPENAI_REALTIME_VOICE` | Configure default model/voice for Realtime sessions. |
| `OPENAI_REALTIME_TURN_SERVERS` | Optional JSON (or comma-delimited) TURN server configuration forwarded to clients and OpenAI when creating sessions. |
| `OPENAI_TRANSCRIPTION_MODEL`, `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE`, `OPENAI_TTS_FORMAT` | Configure Whisper/S2T plus TTS voices used when recording ChatKit session transcripts. |

## Validation Steps
1. Enable `OPENAI_STREAMING_ENABLED` and `OPENAI_REALTIME_ENABLED`.
2. Create agent session and request realtime token via `/api/agent/realtime/session` supplying `agentSessionId`; ensure `chatkit_sessions` row inserted.
3. Authenticate in the web app and open `/agent-chat`; start a stream with a question, verifying `text-delta` events.
4. Confirm `openai_debug_events` contains both streaming request IDs and realtime session metadata (when debug enabled).
5. Trigger `document.vision_ocr` via MCP (supply a signed document URL) and verify extracted text is returned and logged in `openai_debug_events`.
6. Document results in `CHECKLISTS/AGENT/agent_openai_rollout.md` and `docs/checklists/agent_manifest_staging.md`.

## Limitations & Next Steps
- Tool invocations are not yet resolved in-stream; the agent prompt is configured to operate text-only for now.
- TURN credentials can be supplied via `OPENAI_REALTIME_TURN_SERVERS`, but automated provisioning/orchestration remains a Phase 3 follow-up.
- Evaluation runner is a placeholder pending scenario definitions and nightly automation.
