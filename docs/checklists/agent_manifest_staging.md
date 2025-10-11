# Agent Manifest Staging Validation

## Preconditions
- CI job `agent-manifests` completed on `main` with staging secrets configured.
- `dist/published_agent_ids.json` downloaded from workflow artifact.
- Supabase `agent_manifests` table shows `metadata.openaiAgentId` populated for personas (CLOSE, TAX, AUDIT, ADVISORY, CLIENT, DIRECTOR, SAFETY).

## Validation Steps
1. **Tool Sync**: POST `/api/agent/tools/sync` (authenticated) → expect `{ success: true }`. Check OpenAI Agent dashboard for updated tool list.
2. **Session Start**: Call `/api/agent/start` for each persona (CLOSE, TAX, AUDIT, ADVISORY, CLIENT). Verify:
   - `agent_sessions.openai_agent_id` equals persona-specific ID from Supabase.
   - `openai_thread_id` is non-null.
3. **Plan Execution**: Trigger `/api/agent/plan`; ensure `agent_runs.openai_run_id` recorded and `openai_debug_events` row created.
4. **Run Listing**: Use OpenAI API (`GET /v1/agents/{id}/runs`) to confirm run presence.
5. **Error Logs**: Check logs for absence of `openai.agent_tool_sync_failed` and `openai.agent_id_lookup_failed`.

## Output
Record results and screenshots in release ticket; mark checklist complete before production publish.
