# OpenAI Client Architecture

## Node / TypeScript Services
- `lib/openai/client.ts` exposes `getOpenAIClient`, `refreshOpenAIClient`, and `withOpenAIClient` utility helpers.
- Standard configuration pulls from env (`OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_ORG_ID`, `OPENAI_USER_AGENT_TAG`).
- Default timeout is 60s with singleton reuse to prevent redundant TCP handshakes and allow shared instrumentation.
- Consumers (RAG service, upcoming workers, Next.js API routes) should import `getOpenAIClient()` instead of instantiating `new OpenAI()`.
- Debug logging hooks (`createOpenAiDebugLogger`) receive the shared client instance so Requests API metadata flows into `openai_debug_events` consistently.
- `services/rag/openai-vision.ts` and `services/rag/openai-audio.ts` wrap the Vision/S2T/TTS APIs so agents share consistent logging and error handling.
- `lib/openai/url.ts` normalises `OPENAI_BASE_URL` (removing trailing `/v1` or slashes) and exposes `buildOpenAiUrl()` for composing REST fetch calls without duplicating the version prefix.

## Python Services
- `server/openai_client.py` now provides `get_openai_client` / `refresh_openai_client`, mirroring the TypeScript helper.
- Embedding calls in `server/rag.py` use the shared client and emit `openai_debug_events` records (with optional Requests API enrichment when `OPENAI_DEBUG_FETCH_DETAILS=true`).
- FastAPI and worker entry points rely on the shared helper via the shared RAG module; no ad-hoc `AsyncOpenAI()` instantiations remain.
- When additional assistant workflows are re-enabled, import the helper and invoke `log_openai_debug_event` to retain parity with Phase 0 observability.

## Observability & Runbooks
- Phase 0 now covers debug logging for both Node and Python embeddings; extend dashboards to include the new event stream.
- Update datadog/Splunk routing instructions to reference the shared helpers so rate/usage dashboards remain consistent across environments.
- Finance-specific project scaffolding is described in `docs/openai-finance-project-scaffolding.md`; reference it when promoting environments.
- Configure request tagging via `OPENAI_REQUEST_TAGS=service:rag,env:prod` (comma-separated) and optional quota routing via `OPENAI_REQUEST_QUOTA_TAG=<billing-tag>`. The debug logger persists these tags alongside `openai_debug_events` records so Datadog/Splunk and quota monitors align with OpenAI dashboards.
