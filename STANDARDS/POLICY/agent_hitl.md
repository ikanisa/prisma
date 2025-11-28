# Agent Human-in-the-Loop (HITL) Policy (AGT-GOV-1)

## Purpose
Mandate partner-approved guardrails for AI agent executions that interact with client deliverables, ledgers, or regulated evidence. The policy ensures:
- High-risk tools run only after managerial review (ISQM 1 §§32-33, ISA 220R §26).
- All approval attempts leave immutable audit evidence and telemetry for QMS monitoring.
- Tool catalogue changes follow least-privilege principles with segregated duties.

## Scope
Applies to:
- Supabase tables `agent_sessions`, `agent_runs`, `agent_actions`, `agent_traces`, `tool_registry`, `approval_queue` (kind `AGENT_ACTION`).
- API routes `/api/agent/*`, `/v1/approvals`, `/v1/approvals/:id/decision`.
- UI surfaces exposing agent planner, execution, and approvals sidebar.

## Control Requirements
| Control | Description | Implementation | Evidence |
| --- | --- | --- | --- |
| Tool Sensitivity Catalogue | Maintain central registry of agent tools with minimum role, sensitivity, standards mapping. | `tool_registry` table, seeded defaults `supabase/seed/001_tool_registry.sql`; UI admin page consumes same registry. | Supabase row history, ActivityLog (`TOOL_REGISTRY_UPDATED`). |
| Sensitive Tool Gating | Block sensitive tools for users below `MANAGER` until approval recorded. | `services/rag/index.ts` inserts `agent_actions` with `status='BLOCKED'` + `approval_queue` row via `createAgentActionApproval`. | `agent_actions` row, `approval_queue` entry, ActivityLog `AGENT_TOOL_CALL`. |
| Approval Decision Workflow | Only managers (or higher) can approve/reject agent actions. Decisions update session state and log evidence. | `/v1/approvals` + `/v1/approvals/:id/decision`, RLS on `approval_queue`, `reshapeApprovalRow` helper attaches evidence, comment, resume outcome. | `approval_queue` decision metadata, `agent_traces` resume entry, ActivityLog. |
| Resumption Logging | Approved actions resume original handler under approver context with full trace + hashes. | `resumeApprovedAction` in `services/rag/index.ts`; traces + session status updates. | `agent_traces` payload (`resumedFromApproval=true`), `activity_log` with `inputHash`/`outputHash`. |
| Rejection Handling | Rejections mark action/session failed with reason, captured for telemetry. | `rejectBlockedAction` updates `agent_actions`, `agent_sessions`, traces, ActivityLog. | `agent_actions.output_json.error='approval_rejected'`, `agent_sessions.status='FAILED'`. |
| Monitoring & Telemetry | Expose weekly approval backlog, error traces, success rate. | `/analytics/agent` endpoint aggregates `agent_sessions`, `agent_traces`, `approval_queue`. | Analytics snapshot, Grafana panel `Agent HITL`. |

## Data & Security
- **RLS**: `agent_runs`, `agent_actions`, `agent_traces`, `tool_registry`, and extended `approval_queue` enable row-level security with policies requiring `public.is_member_of` and `public.has_min_role`. Service roles must execute with minimal scope.
- **Enums**: `agent_run_state`, `agent_action_status`, `agent_trace_type`, `approval_status` (extended with `CHANGES_REQUESTED`). Enforce allowed values when ingesting data.
- **Audit Trail**: `requested_by_user_id`, `approved_by_user_id`, and `decision_comment` are mandatory for approvals. Evidence attachments stored in `context_json.evidenceRefs`.
- **Autonomy Alignment**: `tool_registry.min_role` aligns with autonomy floor/ceiling to prevent service accounts from bypassing approvals.

## Operational Procedures
1. **Tool Onboarding**
   - Product owner drafts request with tool description, required role, standards, sensitivity.
   - QA adds entry to `tool_registry` (org-specific or global) and captures change in Change Advisory ticket.
   - Run regression suite from [Test Plan](../../TEST_PLAN.md#agent-hitl-validations).

2. **Approval Backlog Review (Daily)**
   - Managers review `/v1/approvals?orgSlug=...` and clear pending `AGENT_ACTION` items.
   - Escalate stale approvals (>24h) via incident channel, include `approvalId`, `sessionId`.

3. **Incident Response**
   - If erroneous approval observed, change status to `CHANGES_REQUESTED`, set `decision_comment`, rerun agent plan with corrected scope, record follow-up in ActivityLog.
   - Notify QA to add regression coverage if gap identified.

## Testing References
- Automated: `tests/approval-service.test.ts`, future integration tests `tests/agent/execute-approval.int.test.ts` (placeholder).
- Manual: [`CHECKLISTS/AGENT/agent_hitl_acceptance.md`](../../CHECKLISTS/AGENT/agent_hitl_acceptance.md).
- Policies: `scripts/test_policies.sql` assertions for new columns and RLS coverage.

## Documentation & Training
- Update release notes and onboarding guide to include HITL overview.
- Conduct brown-bag session covering manager approval UI and decision logging expectations.
