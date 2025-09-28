# Financial Reporting & Disclosure Composer

## Scope
This guide covers the Phase 4 accounting deliverables:

- Close engine artefacts (ledger, journal workflow, reconciliations, trial balance snapshots, close periods)
- IFRS/IAS disclosure composer and note generator
- Inline XBRL (ESEF) export support
- Group consolidation (IFRS 10/11/12 + IAS 21) with automatic intercompany eliminations

## Data flow
1. **Accounting close API** (`/functions/v1/accounting-close`) handles ledger imports, journal lifecycle, reconciliations,
   PBC instantiation, trial balance snapshots, and close period locking. Client helpers reside in
   `src/lib/accounting-close-service.ts`.
2. **Financial statements draft** – `/api/financials/draft` aggregates ledger data by `fs_lines` / `coa_map` and returns
   balance sheet, income statement, cash flow, and trial balance payloads.
3. **Disclosure composer** – `/api/financials/notes` builds IFRS topic notes (IFRS 15/16/9, IAS 36/12/19/7, IFRS 13/8)
   using trial balance heuristics. Accessible via the Audit Report page.
4. **Inline XBRL** – `/api/financials/esef` packages statement facts into a multipart Inline XBRL bundle (primary XHTML +
   resources.xml) ready for regulator submission.
5. **Group consolidation** – `/api/financials/consolidation` aggregates parent + subsidiary ledgers, applies IAS 21 FX
   translation, and suggests intercompany eliminations. The `Consolidation workspace` link on the report page opens the
   UI (`src/pages/reporting/consolidation.tsx`).

## Usage
- From the Audit Report screen, select **Disclosures & IFRS notes** → **Refresh notes** to generate the disclosure pack.
- Use **Download ESEF (iXBRL)** to retrieve the inline XBRL archive. The route accepts optional `periodLabel`, `basis`,
  and `currency` query parameters for jurisdiction-specific variants.
- Programmatic access: use `fetchFinancialNotes` / `requestEsefExport` (see `src/lib/financial-report-service.ts`) and
  `fetchConsolidatedTrialBalance` (`src/lib/consolidation-service.ts`).

## Governance & RLS
- Tables created in `supabase/migrations/2025092410300*_accounting_close_gl*.sql` include RLS policies defined in
  `supabase/migrations/20250924103001_accounting_close_gl_rls.sql`.
- ActivityLog is enriched with `GL_*`, `RECON_*`, `TB_SNAPSHOT_*`, and `CLOSE_PERIOD_*` events (see
  `docs/activity-event-catalog.md`).
- Approvals leverage `approval_queue` for journal batches and close locks (Manager+/Partner thresholds).

## Testing
- Unit coverage for client helpers: `tests/audit/audit-plan-service.test.ts`, `tests/audit/tenant-client.test.ts`,
  and `tests/error-notify.test.ts` exercise authentication, mapping, and failure modes.
- Run `npm test` for the Vitest suite and `npm run coverage` to gauge overall metrics.
- pgTAP script (`scripts/test_policies.sql`) includes ledger, reconciliation, and telemetry policy assertions.

## Future Enhancements
- Expand Inline XBRL tagging to full taxonomy with segment & dimensional context.
- Attach narrative templates per jurisdiction (e.g., GAPSME) and allow override via disclosure editor UI.
- Integrate scenario-specific tests (k6 load, Playwright smoke) for close workflows and ESEF export.
