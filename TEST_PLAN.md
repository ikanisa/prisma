# Test Plan

## Table of Contents
- [Testing Pyramid](#testing-pyramid)
- [Fixtures and Mocks](#fixtures-and-mocks)
- [Running Tests](#running-tests)
- [CI Matrix](#ci-matrix)

## Testing Pyramid
1. **Unit Tests**: Components, hooks, util functions using Vitest and Testing Library.
2. **Integration Tests**: Supabase edge functions and scheduled automation jobs with mocked external services.
3. **End-to-End Tests**: User flows via Playwright hitting staging automation APIs & Supabase.

## Fixtures and Mocks
- **OpenAI**: Mock with `nock` or custom fetch wrapper returning deterministic responses.
- **Google Sheets**: Use `googleapis` mock or local JSON to emulate sheet operations.
- **Supabase**: Use `@supabase/supabase-js` with local test instance or mocking.

## Running Tests
```bash
# install dependencies
npm ci

# run unit tests
npm test

# run integration tests
npm run test:integration

# run e2e
npm run test:e2e

# collect coverage (v8)
npm run coverage

# run RLS policy tests against Supabase (requires DATABASE_URL)
chmod +x scripts/test_policies.sql
psql "$DATABASE_URL" -f scripts/test_policies.sql

# targeted financial reporting tests
npm test -- tests/financials/consolidation-service.test.ts

# targeted group audit API + helpers
# targeted group audit API + helpers + agent approvals
npm test -- --run "tests/api/group-*.test.ts" "tests/audit/module-records.test.ts" "tests/audit/approvals.test.ts" "tests/audit/evidence.test.ts" "tests/audit/idempotency.test.ts" "tests/approval-service.test.ts"

# load/performance baseline (k6)
k6 run tests/perf/k6-group-audit.js
```

## Manual Regression – KAM Module (Job E1)
1. **Seed inputs**: ensure engagement has at least one significant risk (`risks.is_significant = true`), estimate with `uncertainty_level = HIGH`, and going concern worksheet with `assessment = MATERIAL_UNCERTAINTY`.
2. **Fetch pipeline**: go to `/[org]/engagements/[engagementId]/reporting/kam`; confirm auto-seeded candidates for risk/estimate/GC plus ability to add manual candidates.
3. **Selection**: mark the revenue risk candidate as `SELECTED`, leaving rationale captured; verify ActivityLog entry.
4. **Drafting**: create draft, populate heading/why/how/results, link ≥1 planned procedure (with ISA refs) and ≥1 evidence/document; save draft.
5. **Submission**: submit draft; confirm status `READY_FOR_REVIEW`, Approval Queue contains `MANAGER`/`PARTNER` (and `EQR` when engagement `eqr_required = true`).
6. **Approvals**: use `/functions/v1/audit-kam/approval/decide` (or UI action) to approve manager/partner (and EQR if required); verify draft transitions to `APPROVED`, partner fields populated, ActivityLog entries `KAM_DRAFT_APPROVAL_APPROVED` and `KAM_DRAFT_APPROVED`/`KAM_DRAFT_EQR_APPROVED` recorded.
7. **Export**: copy Markdown scaffold and JSON payload; verify contents include narrative, procedures, and evidence references.
8. **Regression**: run `npm test` to execute `tests/kam-export.test.ts` ensuring export helpers stay stable.

### Report Builder (Job E2)
1. Create report draft via UI (auto seeds approved KAM, GC flag) and confirm ActivityLog entry.
2. Update opinion to Qualified, add basis text, toggle EOM/OM, select subset of KAMs; verify preview updates.
3. Run decision tree; confirm recommended opinion feeds the UI and GC toggle.
4. Submit for approval; ensure Approval Queue shows MANAGER/PARTNER and EQR when engagement flagged.
5. Manually set approval statuses in Supabase (or via admin) and set draft `status='APPROVED'`, then trigger Release; verify status `RELEASED` and ActivityLog `REPORT_RELEASED`.
6. Export PDF; confirm toast path and that `documents` table holds `application/pdf` entry plus TCWG markdown stub after release.
7. Re-run `npm test` for regression (see note on jsdom dependency).

### TCWG Pack (Job E3)
1. Ensure report draft is released and TCWG prerequisites (approved KAM, misstatements, GC) exist.
2. Create TCWG pack; verify auto-populated independence text, scope summary, misstatements arrays.
3. Edit independence, scope, findings, add ≥2 deficiencies (High/Medium) and save.
4. Render PDF → check documents entry; Build ZIP → ensure SHA-256 returned.
5. Submit for approval; approve Manager/Partner (and EQR if required) through `/approval/decide`; confirm pack status updates to `APPROVED`.
6. Send pack → signed link displayed, archive manifest updated (`engagement_archives`), ActivityLog includes `TCWG_SENT` and `ARCHIVE_UPDATED_TCWG`.
7. Confirm pack status `SENT`, and client share link accessible during its validity.

### Acceptance & Independence (Job AC-1)
1. Open `/[org]/engagements/[engagementId]/acceptance`; run background screening with risk rating and notes.
2. Capture independence threats and safeguards, set conclusion, and save; refresh to confirm fields hydrate from stored assessment.
3. Submit acceptance decision with EQR requirement flag; verify approvals card shows `PARTNER` stage in UI and Supabase queue (`ACCEPTANCE_DECISION`).
4. Approve decision via `/functions/v1/audit-acceptance/decision/decide` or UI action; acceptance status updates to `APPROVED`, engagement `eqr_required` reflects flag, approvals timeline updates.
5. Attempt to access KAM/Report/TCWG tabs before approval (should be blocked); retry after approval (should unlock).
6. Confirm ActivityLog records `ACC_SCREEN_RUN`, `ACC_INDEP_ASSESSED`, `ACC_DECISION_SUBMITTED`, and `ACC_DECISION_APPROVED/REJECTED`.

### Agent HITL (HITL-1)
1. Start an agent session as an `EMPLOYEE` (`POST /api/agent/start`) and confirm `agent_sessions.status='RUNNING'`, `agent_runs.state='PLANNING'`.
2. Generate a plan (`POST /api/agent/plan`) with fallback disabled to ensure OpenAI response recorded; verify summary stored in `agent_runs.summary`.
3. Execute a non-sensitive tool (`rag.search`) and confirm `agent_actions.status='SUCCESS'` with no approval queue entry.
4. Execute a sensitive tool (`docs.sign_url`) as `EMPLOYEE`; verify response `status='BLOCKED'`, `approval_queue.kind='AGENT_ACTION'`, and session state `WAITING_APPROVAL`.
5. Review `/api/agent/approvals?orgId=...` as `MANAGER` (or the direct `/v1/approvals?orgSlug=...` fallback); ensure pending items surface action labels, standards, evidence placeholders, and session references.
6. Approve the item via `/api/agent/approvals/{id}/decision` supplying evidence/comment. Confirm the proxy forwards auth headers, the underlying `/v1/approvals/{id}/decision` succeeds, `agent_actions.status='SUCCESS'`, `agent_traces` record `resumedFromApproval=true`, and ActivityLog captures input/output hashes.
7. Re-run with rejection (`decision='CHANGES_REQUESTED'`) through the same proxy; ensure sessions flip to `FAILED`, `agent_actions.output_json.error='approval_rejected'`, and telemetry reflects the failure state.
8. Toggle `tool_registry.enabled=false` for `docs.sign_url` and rerun; verify execution fails with `tool_not_available` and endpoint surfaces a friendly error.
9. Execute `scripts/test_policies.sql` focusing on assertions for `agent_runs/agent_actions/agent_traces/tool_registry/approval_queue`.
10. Capture screenshots / JSON payloads and attach to the [Agent HITL checklist](CHECKLISTS/AGENT/agent_hitl_acceptance.md) for release evidence.
11. When `OPENAI_DEBUG_LOGGING=true`, confirm `openai_debug_events` receives a record for the sampled agent plan/run and that debug fetches succeed (or raise a logged warning if the API rejects the request).

### MCP Orchestrator (Phase A)
1. Ensure `OPENAI_ORCHESTRATOR_ENABLED=true` and `ORCHESTRATION_POLL_INTERVAL_MS` set to desired cadence.
2. POST `/api/agent/orchestrator/session` with an objective and sample tasks; verify response includes `session` + `tasks` arrays.
3. Poll `/api/agent/orchestrator/session/{id}` to confirm status transitions (`PENDING` → `RUNNING` when scheduler assigns tasks).
4. POST `/api/agent/orchestrator/tasks/{id}/complete` with `status='COMPLETED'` and sample output metadata; confirm response includes updated board and Supabase rows (`agent_orchestration_tasks`, `agent_orchestration_sessions`).
5. Trigger a safety event payload in the same request and ensure `agent_safety_events` captures severity/rule code.
6. Disable the orchestrator flag and confirm the endpoints return `404 orchestrator_disabled` to prevent accidental usage in environments that are not ready.
7. Seed a session with default `audit.execution` tasks (no manual metadata) and observe the scheduler auto-completing them with an `audit-risk-summary` output payload.

### Streaming Playground (Phase S-1)
1. Flip `OPENAI_STREAMING_ENABLED=true` and authenticate as a valid user.
2. Navigate to `/agent-chat`; provide an org slug and question, then start the stream.
3. Verify incremental `text-delta` events arrive and final `completed` event closes the stream.
4. Check browser dev tools for SSE payloads and ensure no network errors occur when stopping the stream manually.
5. Query `openai_debug_events` to confirm the streaming request was recorded with `metadata.streaming=true`.
6. If `OPENAI_REALTIME_ENABLED=true`, call `POST /api/agent/realtime/session` via the playground button and validate the returned client secret can establish a WebRTC session using OpenAI’s SDK.
7. When `OPENAI_STREAMING_TOOL_ENABLED=true`, use “Start tool stream” to observe `tool-start` / `tool-result` events for RAG lookups and confirm the final response still arrives.
8. Capture a sample SSE log (including tool events) and attach to the release ticket for audit trail.

### Sora Video (Phase V-1)
1. Toggle `OPENAI_SORA_ENABLED=true` and ensure API key has videos scope.
2. POST `/api/agent/media/video` with `{ orgSlug, prompt }`; expect HTTP 202 and a job payload.
3. If access is restricted, verify the route returns an informative error captured in logs (`openai.sora_video_failed`).
4. Document job IDs and follow-up steps for manual polling (pending full integration).

### PBC Manager (Job PBC-1)
1. After acceptance approval, open `/[org]/engagements/[engagementId]/reporting/pbc`; confirm gating message hidden.
2. Instantiate the Revenue template; verify three `pbc_requests` rows created with cycle `Revenue` and ActivityLog shows `PBC_CREATED`.
3. Instantiate the Cash template; ensure bank statement item maps to the bank reconciliation procedure when available.
4. Select the “Bank statements” row, mark as received with a sample document; confirm `pbc_deliveries` row created, status set to `RECEIVED`, ActivityLog `PBC_RECEIVED` logged, and related evidence row references the document and procedure.
5. Trigger “Remind” on a pending request; check ActivityLog `PBC_REMINDER_SENT` and notification entry.
6. Run `npm test` to execute `tests/pbc-manager.test.ts` verifying template-to-procedure matching heuristics for Revenue & Cash cycles.

### Controls Matrix & ITGC (Job CTRL-1)
1. Navigate to `/[org]/engagements/[engagementId]/reporting/controls`; confirm acceptance gating passes.
2. Add three Revenue cycle controls (key, frequency recorded); verify `controls` table rows and ActivityLog `CTRL_ADDED` entries.
3. Log walkthrough for one control (result `IMPLEMENTED`); check `control_walkthroughs` row and ActivityLog `CTRL_WALKTHROUGH_DONE`.
4. Run attributes test with sample size 20 → backend coerces to ≥25; re-run with `EXCEPTIONS`, observe deficiency auto-created and ActivityLog `CTRL_TEST_RUN` + `CTRL_DEFICIENCY_RAISED`.
5. Confirm deficiency appears in the Controls page list and in the TCWG tab after refresh (pack `deficiencies` array updated).
6. Add ITGC ACCESS group note; validate `itgc_groups` insert and presence in UI.

### Treaty WHT & MAP Tracker (Job T-3A)
1. Navigate to `/[org]/tax/treaty-wht`; confirm Supabase connectivity badge renders correctly.
2. Compute a €100k dividend with domestic 25% vs treaty 10%; verify relief summary equals €15k and ActivityLog `TREATY_WHT_COMPUTED` captures metadata.
3. Ensure computation history lists the new record (jurisdiction, rates, relief amount) and links to the stored calculation.
4. Create a MAP case (counterparty US, status OPEN) and confirm it appears in the case table with expected fields.
5. Log an event (e.g., Submission) and check the timeline plus ActivityLog `TAX_DISPUTE_EVENT_LOGGED`.
6. Update the case status to RESOLVED and ensure relief amount persists and list reflects the new status.

### US Overlays (Job T-3B)
1. Navigate to `/[org]/tax/us-overlays`; choose each overlay type in turn and confirm the form adjusts to required inputs.
2. Run a GILTI scenario (tested income 500k, QBAI 200k). Verify net GILTI tax is stored, ActivityLog `US_GILTI_COMPUTED` fires, and history shows the calculation.
3. Run a §163(j) scenario with expense > limitation; confirm disallowed interest and updated carryforward values are persisted.
4. Compute a CAMT case with AFSI 2m and credits; ensure top-up equals CAMT minus regular tax and is stored as adjustment.
5. Compute a stock buyback excise calculation (net repurchase 300k, exceptions 50k) and check excise tax equals 2.5k.
6. Confirm the history filter (by overlay type) works and that adjustment amounts tie to the expected metrics in the result panel.

### Telemetry Sync (Phase T-4B)
1. Invoke `/functions/v1/telemetry-sync` with the organisation slug for the active workspace.
2. Verify `telemetry_coverage_metrics` contains rows for `TAX_TREATY_WHT` and `TAX_US_OVERLAY` with coverage ratios aligned to recent computations.
3. Confirm `telemetry_service_levels` upserted `MAP_CASE_RESPONSE` with `open_breaches` matching unresolved dispute cases.
4. Re-run telemetry sync for a different period window; ensure data upserts instead of duplicating rows.
5. Smoke check `src/lib/telemetry-service.ts` by calling `syncTelemetry` from a manager session and observing the returned payload.

### Error Notification Pipeline
1. Simulate an edge-function failure by calling `/functions/v1/error-notify` with test payload (`module=TAX_US_OVERLAY`, synthetic error message).
2. Confirm `telemetry_refusal_events` includes an `EDGE_FUNCTION_ERROR` row with severity `ERROR` and metadata aligning to the payload.
3. If `ERROR_NOTIFY_WEBHOOK` is configured, verify the external channel receives a notification; otherwise ensure the function handles missing webhook gracefully.
4. Use `notifyError` helper from a test harness and ensure errors bubble correctly when the function responds with non-200.

### Archive Manifest (Phase T-4B)
1. Trigger `/functions/v1/archive-sync` for an engagement with completed acceptance/TCWG workflows.
2. Inspect `engagement_archives` to ensure `manifest` includes acceptance, TCWG, and module summaries with updated timestamps.
3. Validate `sha256` matches a locally computed hash of the manifest JSON.
4. Confirm ActivityLog records `ARCHIVE_MANIFEST_UPDATED` with matching checksum metadata.
5. Use `syncArchive` helper to update the manifest from the front-end and repeat the verification steps.

## CI Matrix
| Node Version | OS |
|---|---|
| 20.x | ubuntu-latest |

Include steps: `npm ci`, `npm run lint`, `npm test`, integration tests behind flag, `npm audit --omit=dev`, and artifact test reports.
