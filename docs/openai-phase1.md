# OpenAI Integration – Phase 1 (Agents Platform)

## Highlights
- Tool registry synchronises with the OpenAI Agents Platform when `OPENAI_AGENT_PLATFORM_ENABLED=true`.
- Agent sessions persist OpenAI thread/agent identifiers; plan requests optionally create agent runs for auditing.
- Environment toggles and schema changes prepare the codebase for moving execution to Agents SDK in later phases.
- ChatKit session service scaffolding persists session references and exposes cancel/resume endpoints.
- Automated agent evaluations (`npm run agents:evaluate`) execute JSON scenarios nightly and emit dashboards-ready telemetry.

## Configuration
| Variable | Description |
| --- | --- |
| `OPENAI_AGENT_PLATFORM_ENABLED` | Enables Agents Platform integration paths. Disabled by default. |
| `OPENAI_AGENT_ID` | Target agent identifier to synchronize tools and create runs against. |
| `OPENAI_AGENT_TOOL_SYNC_CRON` | Optional cron-style schedule (`*/15 * * * *`) to run tool sync in addition to manual endpoint and startup. |
| `OPENAI_AGENT_TOOL_SYNC_ENDPOINT` | Manual endpoint (`POST /api/agent/tools/sync`) guarded by authentication for on-demand synchronisation. |

> Ensure the OpenAI API key has permission to call `/v1/threads`, `/v1/agents/{id}/runs`, and agent update endpoints.

## Data Model Changes
- `agent_sessions` now includes `openai_agent_id` and `openai_thread_id`.
- `agent_runs` records `openai_run_id` and `openai_response_id` when runs are created.
- `openai_debug_events` continues to capture request-level metadata (Phase 0).

## Operational Checklist
1. Enable `OPENAI_AGENT_PLATFORM_ENABLED` in a staging environment and configure `OPENAI_AGENT_ID`.
2. Trigger tool synchronisation via service restart or `POST /api/agent/tools/sync`; verify logs show `openai.agent_tool_sync_completed`.
3. Start a new agent session; validate `agent_sessions.openai_thread_id` is populated.
4. Submit a plan and confirm `agent_runs.openai_run_id` is set and the debug logger captured the associated response.
5. Monitor error logs for `openai.agent_*` events; adjust service account permissions as needed.
6. Capture smoke-test notes in `CHECKLISTS/AGENT/agent_openai_rollout.md` and follow `docs/checklists/agent_manifest_staging.md` for ChatKit validation.

## Next Steps (Phase 2)
- Replace manual planning/execution with streaming Agents SDK calls.
- Surface OpenAI run status in the UI for live monitoring.
- Create automated manifest sync jobs scoped per organisation/tool pack.
