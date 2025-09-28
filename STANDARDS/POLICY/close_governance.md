# Accounting Close Governance Policy

## Scope and authoritative standards
- IAS 1.15-1.25, IAS 1.54-1.138 and IAS 7.18-7.50 require complete and unbiased primary statements supported by reconciled ledgers and disclosures.
- IAS 21.9-21.30 requires identification of functional currency and periodic remeasurement of foreign currency balances.
- EU Accounting Directive 2013/34/EU Articles 4-6 and 36-40 mandate adequate accounting records, monthly reconciliation discipline and management responsibility for the annual report.
- Malta GAPSME (L.N. 289 of 2015) follows the same control expectations for SMEs; the governance model below therefore applies to all Malta entities regardless of reporting framework.

## Period close cadence
1. **Day 0-2** — Instantiate Prepared-by-Client (PBC) checklist by area (bank, AR, AP, GRNI, payroll, VAT, fixed assets). Assign owners and due dates in the workspace and require uploads via the secure document system. Statuses move from `REQUESTED` → `RECEIVED` → `APPROVED` only when evidence is reviewed.
2. **Day 2-4** — Import trial balance and sub-ledger detail. Journal batches may only be created through the managed API so that debits equal credits and sources are tagged.
3. **Day 4-6** — Perform reconciliations for cash, trade receivables/payables, GRNI, payroll liabilities and other material balances. Differences must be explained through reconciling items (DIT/OC/timing/error) before status changes to `CLOSED`.
4. **Day 6-7** — Run variance analytics comparing the period to the baseline (prior period or budget) using configured IAS 1 thresholds. Exceptions remain open until narrative support is documented.
5. **Day 7** — Capture the trial balance snapshot, advance the close status to `READY_TO_LOCK`, obtain management approval, then lock the period. Post-lock, ledger_entries for that period are read-only.

## Journal entry governance
- **Preparation** — Journal batches require preparer, period, reference and optional attachment. Lines must balance in real time before submission.
- **Control rules** (triggered on submit):
  - *Late posting* (HIGH): journal date after the close end date or after lock time.
  - *Weekend/out-of-hours* (MEDIUM): creation timestamp outside 06:00-20:00 local time Monday-Friday.
  - *Round amount* (MEDIUM): any line ≥ 10,000 EUR divisible by 1,000.
  - *Manual to sensitive accounts* (HIGH): manual journals hitting cash, revenue, reserves or related-party accounts.
  - *Missing attachment* (LOW): batches without supporting documentation where policy requires.
- **Approval** — Only MANAGER+ roles may approve; HIGH alerts must be resolved before approval. Posting is allowed solely for APPROVED batches and writes an immutable ActivityLog event (JE_POSTED) with payload checksum.

## Reconciliation standards
- Reconciliations capture GL balance, external balance, difference and reconciling items.
- Preparers document each reconciling item with amount and reference. Reviewers confirm resolution before status moves to `CLOSED`.
- Evidence (exported CSV/PDF schedule) is stored in immutable storage with the document id linked to the reconciliation record.

## Variance analytics
- Variance rules may be configured for accounts or financial statement lines (abs and/or percentage thresholds).
- The variance run stores the current value, baseline, delta and status in `variance_results`. Items default to `OPEN`; explanations or approvals transition them to `EXPLAINED` or `APPROVED`.
- ActivityLog records (`VARIANCE_RUN`) track each execution with the rule ids evaluated.

## Close advance and lock criteria
The system prevents locking until all criteria below are met:
1. All PBC items are in `APPROVED` or `OBSOLETE` status.
2. Required reconciliations (BANK, AR, AP, GRNI, PAYROLL) are `CLOSED` with zero difference.
3. No `variance_results` remain in `OPEN` state.
4. Every journal batch is either `POSTED` or `REJECTED`.
5. Trial balance snapshot captured for the period (totals match debits/credits).
6. Approval recorded in the approvals table (`CLOSE_LOCK_APPROVAL`) by MANAGER or PARTNER role.

When locked, the trial balance snapshot is flagged `locked=true` and subsequent ledger postings for the period are rejected. Unlocking requires Partner override and is logged with justification.

## Evidence retention and traceability
- ActivityLog captures all key events: GL imports, journal lifecycle actions, reconciliation closures, variance runs, close stage transitions and locks.
- Traceability matrix entries map the policy controls to IAS 1/7/21 and EU Directive references. Evidence links (document ids or snapshot ids) are attached to each event.
- Documents are served only via signed URLs with expiry ≤ 15 minutes.
- Supabase row-level security enforces org-level segregation. Approvals require MANAGER+ roles; locks require PARTNER approval as configured.

## Integration with reporting
- Trial balance snapshots feed the draft financial statements and cash-flow scaffolding to support IAS 1 presentation and IAS 7 reconciliation.
- Variance explanations populate management review memos and audit committee packs.
- Locking triggers downstream automation to update the immutable archive manifest with hashes for the TB snapshot, reconciliation schedules and approvals.
