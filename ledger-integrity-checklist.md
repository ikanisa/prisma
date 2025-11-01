# Ledger Integrity Checklist

_Last updated: 2025-11-04_

## Pre-Cutover Controls
- [x] Run `scripts/maintenance/jobs/journal-ledger-sanitizer.mjs` against staging dataset and archive summary output.
- [x] Validate ledger retention + storage metadata recorded via `summarizeExecution` environment variables.
- [ ] Capture Supabase exports for `ledger_entries` + `journal_entries` and store hashed manifest.

## Data Quality Gates
- [x] `recentLedgerEntries` sample validated for last 24h across top 3 pilot orgs.
- [x] `ledgerEntriesByAccount` recon performed on revenue accounts (match to finance workbook).
- [ ] `findEntriesWithoutSource` exception report reviewed and signed off by finance lead.
- [ ] Schedule automated balance roll-up job monitoring (hourly) and attach dashboard link.

## Evidence to Attach
- Sanitizer job console output + dataset metadata.
- Reconciliation worksheet referencing `src/lib/finance-review/ledger.ts` helper outputs.
- Sign-off note from finance lead confirming exception report review.
