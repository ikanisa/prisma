# DAC6 Hallmark Assessment (T‑2B)

## References
- **EU Council Directive 2018/822 (DAC6)** – mandatory disclosure of cross-border arrangements.
- Commissioner for Revenue guidance on reporting obligations and hallmarks.

## Inputs captured
- Arrangement reference, description, first step date, disclosure due date.
- Participants (role, jurisdiction, TIN).
- Hallmarks (Category A–E, code, main benefit test indicator).
- Optional notes and metadata for subsequent filings.

## Workflow
1. Access `/tax/dac6` (manager role required).
2. Enter arrangement details, hallmarks, and participants.
3. The Next.js API route `POST /api/dac6/scan` validates payload shape, invokes `scanDac6()` from `apps/web/lib/tax/calculators.ts`, and returns the scoring summary to the UI. The Supabase edge function (`/functions/v1/tax-mt-nid`) remains available for bulk ingestion/export, but the UI scan no longer relies on it.
4. `recordActivity()` writes an in-memory activity entry tagged with `module: 'tax.eu.dac6'`, summary `DAC6 scan executed`, metrics (`totalFlagged`, `highestScore`), and the optional preparer. These entries surface in the history pane so auditors can trace who ran the latest scan and what the outcome was.
5. The history table shows recent arrangements with decision (`Proceed` / `Review`) derived from the scan result; database persistence happens only when the finance ops team promotes an arrangement via the Supabase function or direct SQL workflow.

## Testing
- Hallmark logic covered by `tests/tax/dac6.test.ts`.
- Manual UI verification: create arrangement, verify history entry and status change.
