# OpenAI Integration – Phase 0 Readiness

## Objectives
- Capture the current inventory of OpenAI endpoints in use (Responses, Chat Completions, Embeddings).
- Enable observability for every request via the Debugging Requests API.
- Document access prerequisites for the Agents Platform, Realtime APIs, and Videos (Sora) before deeper adoption.
- Provide a foundation that future phases (Agents Platform migration, Realtime UX, multimodal workflows) can build on without rework.

## Action Items
1. **Credentials & Access**
   - Verify API key scopes, rate limits, and organisation quotas in the OpenAI dashboard.
   - Request access to: Agents Platform, Realtime API, Videos (Sora 2). Track status in release notes.
   - Configure new environment toggles:
     - `OPENAI_DEBUG_LOGGING` – enables request logging to `openai_debug_events`.
     - `OPENAI_DEBUG_FETCH_DETAILS` – fetches enriched payloads from `/v1/requests/{id}/debug`.

2. **Observability Hooks**
   - `services/rag/openai-debug.ts` captures every Responses/Chat/Embedding call and persists result to Supabase (`openai_debug_events`).
   - Set up Grafana or Superset panel querying `openai_debug_events` (see `STANDARDS/TRACEABILITY/matrix.md`).
   - Configure request tags (`OPENAI_REQUEST_TAGS=service:rag,env:<env>,workload:finance`) and optional quota tag (`OPENAI_REQUEST_QUOTA_TAG=<billing-tag>`) so debug events, Datadog/Splunk routing, and OpenAI usage dashboards remain aligned.
   - Audit the Supabase retention policy for debug data (default infinite – adjust if necessary).

3. **Tool Catalogue Sync Prototype**
   - Compare `tool_registry` entries with desired Agents Platform tool manifests.
   - Draft initial manifest in `scripts/` (future phase) that maps local tool metadata (key, minRole, standards) to OpenAI tool schema.

4. **Documentation Updates**
   - `DATA_MODEL.md` and `STANDARDS/TRACEABILITY/matrix.md` updated with new telemetry table.
   - `TEST_PLAN.md` Agent HITL section includes guidance to validate debug logging once the flag is enabled.
   - `CHECKLISTS/AGENT/agent_hitl_acceptance.md` should reference debug log verification when toggled on (Phase 1 follow-up).

## Follow-Up Tasks (Phase 1 Candidates)
- Generate signed agent manifests via Agents SDK, seeded from `tool_registry`.
- Persist OpenAI agent run/session identifiers alongside local session metadata for traceability.
- Build dashboards correlating `openai_debug_events` with `agent_actions` outcomes to highlight refusal root causes.
 - Record completion in `CHECKLISTS/AGENT/agent_openai_rollout.md`.

Keep this document updated as access is granted and prerequisites are satisfied.
