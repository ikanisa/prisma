# UAT Day 2 – Tax Stream

## Participants
- Tax Partner (lead)
- QA Engineer / Scribe

## Preconditions
- Tax entities seeded (see `tests/perf/telemetry-sync.js` fixture hints).
- Access token with `MANAGER` role for tax modules.

## Script
1. **Malta CIT/NID**
   - Execute `/api/tax/cit/compute` via UI (Tax -> CIT).
   - Validate refund profile calculations and review ActivityLog.
2. **ATAD ILR/CFC & Fiscal Unity**
   - Process ATAD ILR scenario; confirm RLS prevents cross-org data.
   - Run fiscal unity computation and export summary.
3. **DAC6 & Pillar Two**
   - Trigger DAC6 hallmark assessment; ensure telemetry coverage updates.
   - Run Pillar Two scenario and export GIR.
4. **Treaty WHT / MAP & US Overlays**
   - Evaluate treaty WHT calculator with MAP case; ensure telemtry alert inserts when unresolved.
   - Run US overlay calculators (GILTI/163(j)/CAMT) and confirm approvals.

## Artefacts
- Exported PDFs/CSVs stored in `docs/UAT/artifacts/day-2/`.
- Telemetry snapshots captured via `/api/telemetry/summary`.
