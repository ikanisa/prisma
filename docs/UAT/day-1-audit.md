# UAT Day 1 – Audit Stream

## Participants
- Audit Partner (lead)
- QA Engineer / Scribe

## Preconditions
- Staging environment populated via `supabase/functions/seed-data`.
- Acceptance decisions recorded for the test engagement (use `/api/acceptance` helpers).
- Test accounts with `MANAGER` and `SYSTEM_ADMIN` roles.

## Script
1. **Acceptance & Independence**
   - Navigate to `/audit/acceptance` and confirm acceptance/independence workflow reflects seeded data.
   - Trigger an independence update and verify ActivityLog (`ACCEPTANCE_UPDATED`).
2. **KAM drafting**
   - Visit `/reporting/kam`.
   - Draft a candidate, submit for approval, and capture generated PDF/notes.
   - Validate Supabase rows (`kam_candidates`, `kam_drafts`, `activity_log`).
3. **Report Builder**
   - Navigate to `/reporting/report`.
   - Run decision tree, export summary, and download IFRS note pack.
4. **TCWG Pack & Consolidation**
   - Generate TCWG pack via `/audit/tcwg` and confirm archive manifest entry exists.
   - Review consolidation workspace `/reporting/consolidation` and export elimination worksheet.

## Artefacts
- Screenshots/PDFs saved in `docs/UAT/artifacts/day-1/`.
- ActivityLog IDs recorded in `docs/UAT/day-1-signoff.md`.
