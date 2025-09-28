# Malta Corporate Income Tax & Imputation Engine (T‑1A)

## Standards & references
- **Malta Income Tax Act (Cap.123)** – corporate tax rate 35%, full imputation system, shareholder refunds (6/7ths, 5/7ths, 2/3rds).
- **CfR guidance** on tax accounts (MTA, FIA, IPA, FTA, UA) and refund mechanics.
- **Participation exemption** rules (Articles 12(1)(u), 12(1)(c)(ii)) – EU/foreign source dividend and disposal relief.
- **EU ATAD** considerations for interest limitation and CFC (handled in later phases, noted for context).

## Scope
Applies to every Malta tax entity configured in Aurora. Computes corporate income tax (CIT), maintains tax account rollforward, and manages approval/release workflow.

## Workflow summary
1. **Data capture (Employee role)**
   - Inputs: period, pre-tax profit, adjustments (timing/permanent), participation exemption flag, refund profile (6/7, 5/7, 2/3, none).
   - Endpoint: `/functions/v1/tax-mt-cit/compute`.
   - Output: CIT @35%, refund entitlements, stored in `cit_computations` table. ActivityLog `MT_CIT_COMPUTED` and tax account movements registered.

2. **Return preparation (Employee role)**
   - Endpoint: `/prepare-return`; persists schedules in `return_files` (kind `CIT`) for review/filing pack.

3. **Submission for approval (Manager role)**
   - `/submit` transitions computation to `READY_FOR_APPROVAL`, queues approval (`approval_queue` kind `MT_CIT_APPROVAL`, stage `PARTNER`). ActivityLog `MT_CIT_APPROVAL_SUBMITTED`.

4. **Partner approval (Partner role)**
   - `/approve` records decision. Approval `APPROVED` locks computation at status `APPROVED`; ActivityLog `MT_CIT_APPROVED`. Rejection resets to `DRAFT`.

## Controls & governance
- **RLS**: all schema additions filtered by `is_member_of`. Delete permitted only to System Administrators.
- **Audit trail**: computations & return files store user IDs/timestamps. ActivityLog entries cover compute, submission, approval.
- **Tax account integrity**: `tax_accounts` hold opening/closing balances with JSON movement array capturing period, amount, user.
- **Approvals**: partner sign-off before filing aligns with firm policy and local regulations.
- **Traceability**: mapped in `/STANDARDS/TRACEABILITY/matrix.md` to Malta Income Tax references.

## Evidence expectations
- Computation memo (JSON payload) stored via `return_files.payload_meta`.
- Tax account movements showing MTA charge and refund accrual.
- Approval queue entry with partner user ID, timestamp, notes.
- ActivityLog records exported for working papers (ISA 230 documentation discipline reused).

## Telemetry
- Counts of computations per status (`cit_computations.status`).
- Number of pending approvals per period.
- Variance between computed refund and refund actually processed (future enhancement when cash refunds recorded).

## Limitations / Next steps
- NID, Patent Box, ATAD ILR/CFC, VAT/OSS calculators feed adjustments; DAC6 and Pillar Two integrations track analytics metadata for future submission packs.
- Tax account balancing currently relies on deterministic movements; implement SQL helpers (or function) for opening/closing recomputation in later phases.
