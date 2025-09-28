# Audit Reconciliations Workflow

This policy defines the end-to-end workflow for REC1 audit reconciliations, covering bank, accounts receivable (AR), and accounts payable (AP) balances. It aligns with ISA 500 evidence requirements and supports control traceability.

## Roles & Access
- **Managers and above** can create reconciliations, import statements, resolve items, and close periods. Row Level Security (RLS) policies in `supabase/sql/audit_REC1_schema.sql` enforce `public.has_min_role(org_id, 'MANAGER')` for write access.
- **All members of the organisation** can review reconciliation data via RLS select policies that call `public.is_member_of(org_id)`.

## Workflow Steps

1. **Create the reconciliation**
   - Use `POST /api/recon` (Next.js route `apps/web/app/api/recon/route.ts`) or the web workbench (`apps/web/app/audit/reconciliations/page.tsx`).
   - Capture the period start/end, reconciliation type (Bank, AR, AP), currency, and optional control reference.
   - Activity is logged with `RECON_CREATED` in `apps/web/lib/audit/activity-log.ts`.

2. **Import statements**
   - Ledger and external statements are imported through `POST /api/recon/:id/statements` with deterministic line normalisation handled by `reconciliation-store.ts`.
   - Statement headers and lines persist to Supabase tables `audit_reconciliation_statements` and `audit_reconciliation_lines` with RLS.
   - Activity log records `RECON_STATEMENT_IMPORTED` entries.

3. **Run deterministic matching**
   - Invoke `POST /api/recon/:id/match` or the “Run deterministic match” button in the workbench.
   - Matching strategies (amount+date, amount-only) populate `audit_reconciliation_matches` and create `AUTOMATCH` reconciling items for any unmatched lines.
   - Event `RECON_AUTOMATCH_COMPLETED` captures strategy and counts.

4. **Resolve reconciling items**
   - Outstanding items appear in the workbench. Resolutions call `POST /api/recon/items/:itemId/resolve` which records support or misstatement evidence (table `audit_reconciliation_evidence`).
   - Evidence links, follow-up dates, and misstatement flags are stored in `audit_reconciling_items` metadata.
   - Logs `RECON_ITEM_RESOLVED` include misstatement status for traceability.

5. **Close the reconciliation**
   - Final closure uses `POST /api/recon/:id/close` with summary, reviewer notes, and preparer information.
   - Closure generates support evidence and, if outstanding items remain, misstatement evidence entries. Outstanding items are marked resolved with `is_misstatement = true`.
   - Event `RECON_CLOSED` records the close-out, enabling monitoring via the activity log.

## Evidence & Reporting
- Evidence hooks link to `public.documents` and provide reference URLs for external artefacts.
- The workbench offers a schedule export summarising outstanding/follow-up items; the text output should be stored alongside the working paper.
- Supabase schema enforces audit trails via updated-at triggers and ties every artefact to an organisation/engagement for tenant isolation.

## Controls Checklist
- Ensure imported statements are signed off by a manager prior to closure.
- Review misstatement evidence monthly and roll forward unresolved items to management letters.
- Retain exported schedules and evidence links in the engagement’s document folder for ISA 500 retention.
