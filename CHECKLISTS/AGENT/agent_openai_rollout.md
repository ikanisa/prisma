# Agent OpenAI Rollout Checklist

## Preflight
- [ ] Secrets configured: `STAGING_OPENAI_API_KEY`, `STAGING_OPENAI_ORG_ID`, `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_SERVICE_ROLE_KEY` in GitHub Actions.
- [ ] Tool metadata seeded (`supabase/seed/002_tool_registry_metadata.sql`).

## CI Automation
1. Create PR, ensure `agent-manifests` job runs `npm run agents:publish:dry` (dry-run success).
2. Merge to `main`; confirm CI ran `npm run agents:publish:staging` and `npm run agents:update` without errors.
3. Inspect `dist/published_agent_ids.json` artifact and Supabase `agent_manifests.metadata.openaiAgentId` entries.

## Staging Validation
- [ ] Start agent session (e.g., `/api/agent/start`) for each persona (CLOSE, TAX, AUDIT, ADVISORY, CLIENT) → check `agent_sessions.openai_agent_id` & `openai_thread_id` populated.
- [ ] Run plan step → verify `agent_runs.openai_run_id` recorded and `openai_debug_events` entry exists.
- [ ] Manual `POST /api/agent/tools/sync` returns success; check OpenAI Agent dashboard lists updated tools.

## Observability
- [ ] Datadog/Splunk dashboards show new agent IDs and debug events.
- [ ] Logs free of `openai.agent_tool_sync_failed` or `openai.agent_id_lookup_failed` errors.

## Production Cutover
- [ ] Repeat publish/update with production credentials (after staging sign-off).
- [ ] Update runbooks with Agent IDs and prompt links.
- [ ] Notify stakeholders + toggle `OPENAI_AGENT_PLATFORM_ENABLED` in production.
