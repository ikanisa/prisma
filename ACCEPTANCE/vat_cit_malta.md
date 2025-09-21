# Acceptance Script – Malta VAT & CIT Flow

## Objective
Demonstrate regulated tax workflows with calculators, memos, evidence exports, and approvals across VAT and CIT processes.

## Preconditions
- Tax org with Malta VAT/CIT packs configured.
- Employee initiator and Manager reviewer accounts.
- Calculators deployed (`malta_vat_2025`, `malta_cit_2025`).

## Steps
1. **Collect VAT inputs**
   - Upload sales/purchase ledgers to Documents; note docIds.
   - Start tax agent session; request VAT computation.
   - Verify calculator output (`vat_return` JSON) stored in `agent_traces` with citations.
2. **VAT memo with citations**
   - Call memo mode summarizing VAT position.
   - Ensure memo JSON includes `sections[].citations` with config paths; store docRef.
3. **Export VAT working paper**
   - Generate PDF/Excel via working paper tool; save in Documents with hash.
   - Capture `TM-028` references in checklist.
4. **Approval for VAT submission**
   - Attempt submission; verify `approvalId` returned (`APP-VAT-*`).
   - Manager approves through Approvals page; note decision comment.
5. **CIT computation**
   - Restart agent for CIT; load financial statement data.
   - Confirm calculator output (chargeable income, tax payable) persisted.
6. **CIT memo & export**
   - Generate memo with citations; verify compliance similar to VAT.
   - Export CIT working paper; note docRef and Activity log entries.
7. **Approval for CIT filing**
   - Initiate CIT submission; blocked pending approval (`APP-CIT-*`).
   - Manager approves; confirm success trace and Activity log `AGENT_TOOL_CALL` with `resumedFromApproval` flag.
8. **Telemetry verification**
   - Query `/api/agent/telemetry` to ensure groundedness percent reflects memos and approval counts returned to baseline.

## Expected Outcomes
- Two approval records (VAT, CIT) with evidence of manager decision.
- Memo JSON files containing citations and stored docRefs.
- Working paper exports with hashes in Documents.
- Telemetry shows groundedness ≥ 90%, approvals pending count back to 0, refusal counters unchanged.

## Evidence to Capture
- Document IDs for ledgers, memos, working papers.
- `approval_queue.id` values for VAT and CIT.
- `agent_traces` IDs for calculator outputs and approvals.
- Telemetry snapshot (JSON) showing metrics post-run.

