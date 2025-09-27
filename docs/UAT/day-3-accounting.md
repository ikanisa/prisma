# UAT Day 3 – Accounting & Close Stream

## Participants
- Accounting Lead (owner)
- QA Engineer / Scribe

## Preconditions
- Close period seeded with open PBC items and bank statements.
- Manager/Partner accounts authenticated for staging.

## Script
1. **Ledger Import & Journal Workflow**
   - Upload ledger accounts (`/api/gl/accounts/import`) and journal entries (`/api/gl/entries/import`).
   - Submit, approve, and post a journal batch.
2. **Reconciliation Lifecycle**
   - Create reconciliation via `/api/recon/create`, add items, and close.
   - Validate recon summary download and ActivityLog entries.
3. **Trial Balance Snapshot & Variance**
   - Generate TB snapshot (`/api/tb/snapshot`) and run variance analysis.
4. **Close & Archive**
   - Advance and lock the close period, ensuring PBC checklist gate passes.
   - Confirm archive manifest stored and telemetry records updated.
5. **Disclosure Composer & ESEF**
   - Run disclosure composer (`/reporting/report`) and generate Inline XBRL.

## Artefacts
- TB snapshot, variance export, archive manifest stored under `docs/UAT/artifacts/day-3/`.
- Sign-off recorded in `docs/UAT/signoff-day-3.md`.
