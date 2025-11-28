# Agent HITL (Human-in-the-Loop) Acceptance Checklist

This checklist validates the end-to-end approvals flow for sensitive agent tool executions and related governance controls. Complete it before promoting changes beyond staging.

## Preconditions
- Supabase migrations up to `20251115093000_agent_hitl_extensions.sql` applied.
- Seed tool registry defaults (`supabase/seed/001_tool_registry.sql`) executed or global records created manually.
- Test organisation with at least two members: one `EMPLOYEE`, one `MANAGER` (or higher).
- OpenAI planner responses mocked or rate limits lifted for QA.

## Functional Walkthrough
1. **Tool Registry Baseline**
   - Query `tool_registry` and confirm global rows for `rag.search`, `trial_balance.get`, `docs.sign_url`, `notify.user`.
   - Toggle `enabled` to `false` for `docs.sign_url` and verify agent execution is blocked with `tool_not_available`, then re-enable.

2. **Planner Enforcement**
   - Start session `/api/agent/start` as `EMPLOYEE`; ensure `agent_sessions` row seeded with `status='RUNNING'` and companion `agent_runs` entry created with `state='PLANNING'`.

3. **Plan Generation Refusal**
   - Call `/api/agent/plan` with `requestContext.minRoleRequired='MANAGER'`; verify response is `refused`, run summary state `ERROR`, and ActivityLog records refusal metadata.

4. **Non-sensitive Tool Execution**
   - Execute plan step containing only `rag.search`; ensure `agent_actions.status='SUCCESS'`, `agent_traces` entry with `trace_type='TOOL'`, and no approval queue row created.

5. **Sensitive Tool Block**
   - From same session, configure plan step including `docs.sign_url`.
   - Run `/api/agent/execute` as `EMPLOYEE`; expect tool result `status='BLOCKED'`, `agent_sessions.status='WAITING_APPROVAL'`, approval queue row `kind='AGENT_ACTION'`, `status='PENDING'`, `context_json` carrying `sessionId`, `runId`, `toolKey`.

6. **Approval Review Surface**
   - Hit `/api/agent/approvals?orgId=...` as `MANAGER` (UI uses this Next.js route); ensure the pending action exposes standards refs, evidence placeholders, `sessionId`, and `runId`.
   - Optionally cross-check `/v1/approvals?orgSlug=...` for parity. Confirm Supabase row captures `requested_by_user_id`, `requested_at`, `stage='MANAGER'`, `action_id`.

7. **Approval Decision**
   - POST `/api/agent/approvals/{id}/decision` with `decision='APPROVED'`, attach evidence stub. Verify the proxy forwards auth headers to `/v1/approvals/{id}/decision` (monitor logs).
   - Validate `agent_actions.status='SUCCESS'`, approval queue updated with `approved_by_user_id`, `decision_at`, appended evidence.
   - Ensure `agent_traces` contains resumed execution entry (`resumedFromApproval=true`).

8. **Rejection Path**
   - Repeat steps 5–7 but reject via `/api/agent/approvals/{id}/decision` with `decision='CHANGES_REQUESTED'`.
   - Confirm `agent_actions.status='ERROR'`, session transitions to `FAILED`, and trace payload logs rejection reason.

9. **Telemetry & ActivityLog**
   - Review `activity_log` entries for both approval outcomes (`AGENT_TOOL_CALL`, decision metadata) and ensure errors escalate to telemetry feed `/api/analytics/agent` (pending route).

10. **Autonomy & RLS Smoke**
    - Run `scripts/test_policies.sql` to assert RLS policies for `agent_runs`, `agent_actions`, `agent_traces`, `tool_registry`, and extended `approval_queue` columns.

## Evidence Collection
- Export Supabase SQL snapshot showing `approval_queue` row before and after approval.
- Capture `/api/agent/approvals` (or `/v1/approvals`) JSON payload and attach to release ticket.
- Archive console logs from `/api/agent/execute` showcasing blocked → resumed flow.

## Exit Criteria
- All steps above completed without manual DB edits (aside from temporary toggles noted).
- No residual rows in `approval_queue` with `status='PENDING'` for the test session.
- Telemetry dashboard (`/analytics/agent`) reflects the approval attempt metrics.
