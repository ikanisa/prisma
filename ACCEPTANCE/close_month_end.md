# Acceptance Script – Close Month End

## Objective
Validate the month-end accounting cycle from data import through journal approvals, trial balance lock, and financial statement draft generation with required evidence captured.

## Preconditions
- Org slug with demo data (e.g., `/demo`).
- Employee role with data entry permissions; Manager role for approvals.
- Sensitive tool approvals enabled.
- Engagement acceptance completed with independence conclusion `OK` or override approval recorded.

## Steps
1. **Import source data**
   - Navigate to `/demo/documents` → Upload supporting CSV/Excel (AR, AP, bank statements).
   - Verify Activity Log entry `document.uploaded` (capture ID) and Document hash (SHA-256 if provided).
2. **Draft journal entries**
   - Start accounting agent session (`POST /api/agent/start`) with org slug and `agentType: 'ACCOUNTING'`.
   - Request JE recommendations; confirm `agent_traces` records with tool outputs.
   - Export draft JE list to Documents (record docId `DOC-JE-*`).
3. **POST journal – approval gate**
   - Trigger `trial_balance.post` tool through `/api/agent/execute`.
   - Ensure response contains `status: 'BLOCKED'` with `approvalId` (record `APP-POST-*`).
   - Manager visits `/demo/approvals` and approves; note decision timestamp.
4. **Trial balance snapshot**
   - After approval, re-run execute; confirm success trace with TB output.
   - Capture TB snapshot ID from Documents (e.g., `TB-YYYYMM`).
5. **Financial statement draft**
   - Generate FS draft via UI or `/api/agent/execute` for reporting tool.
   - Store FS PDF in Documents; record docRef `FS-DRAFT-*` and Activity log hash.
6. **LOCK period – approval gate**
   - Invoke lock action; capture second `approvalId` (`APP-LOCK-*`).
   - Manager approves; confirm session status returns to RUNNING and Activity log `APPROVAL_GRANTED` entry exists.
7. **Evidence review**
   - Compile references: TB snapshot docId, FS draft docRef, approval IDs, Activity log IDs, trace IDs for refusal/success.

## Expected Outcomes
- Two approval records (`POST`, `LOCK`) with telemetry reflecting updated `approvals.pendingCount` → 0.
- Documents module contains JE export, TB snapshot, FS draft with hashes.
- Activity Log includes entries for document uploads, approvals, and agent tool calls.
- Telemetry latency within targets (p50/p95 < thresholds) and groundedness unaffected.

## Evidence to Capture
- `approval_queue.id` values.
- Document IDs (`DOC-JE-*`, `TB-*`, `FS-*`).
- Activity log IDs (`activity_log.id`).
- Trace IDs from `agent_traces` for POST/LOCK actions.
- Screenshot of Approvals page showing status change.
