# Phase 4 Hardening: Performance & UAT Plan

## Objectives
- Validate deterministic job performance (ADA analytics, reconciliations, consolidation) meets SLA targets.
- Confirm accounting close workflows operate under load without RLS regressions.
- Provide a scripted UAT path for partners covering audit, tax, and accounting modules prior to production launch.

## Performance & Load Testing

| Scenario | Target | Tooling | Notes |
| --- | --- | --- | --- |
| ADA analytics batch | 500 JE runs with combined filters complete in < 3 minutes at p95 | `k6 run tests/perf/ada-k6.js` | Seed staging with 100k journal entries; assert idempotency (no duplicate runs). |
| Reconciliation engine | 200 bank statements (5k lines each) processed in < 5 minutes at p95 | `k6 run tests/perf/recon-k6.js` | Validate unresolved items + PDF generation; ensure `reconciliation_items` RLS intact. |
| Consolidation & disclosures | 10-entity structure with multi-currency ledgers; consolidation < 2 minutes; disclosure notes < 30 seconds | `k6 run tests/perf/disclosure-sync.js` | Monitor Supabase CPU/IO usage; validate eliminations & narrative output. |
| Telemetry sync | Multi-module dataset generates coverage/SLA metrics < 60 seconds | `k6 run tests/perf/telemetry-sync.js` | Ensure `telemetry_service_levels`/`telemetry_coverage_metrics` upsert correctly. |

**Metrics & Monitoring**
- Use Supabase dashboard and Grafana to capture CPU, query latency, and error rates during load.
- Record p95/p99 timings for each scenario; compare to SLA targets above.
- Document any policy cache misses or RLS failures.

**Runbook Steps**
1. Seed staging environment via `supabase/functions/seed-data` (includes ledger scenarios and tax calculators).
2. Execute performance scripts (`scripts/perf/run_k6.sh <scenario>`) which wraps the
   `tests/perf/*.js` scenarios and exports JSON summaries under `docs/PERF/<date>/`.
3. After each load test, run `npm run coverage` and `psql "$DATABASE_URL" -f scripts/test_policies.sql` to ensure no regressions.
4. Capture screenshots of key dashboards and attach k6 summaries from `docs/PERF/<timestamp>/`.
5. Record UAT evidence in `docs/UAT/` (day-by-day scripts stored in `docs/UAT/day-*.md` with sign-off forms).

## UAT & Training Plan

### Participants
- Audit Partner (lead)
- Tax Partner
- Accounting Lead
- QA Engineer / Scribe

### UAT Schedule (3 days)

**Day 1 – Audit Stream**
- Acceptance & independence workflow sign-off (AC-1).
- KAM drafting, approval, and report builder release (E1/E2).
- TCWG pack issuance including new consolidation & disclosures.

**Day 2 – Tax Stream**
- Malta CIT, NID, ATAD ILR/CFC, Fiscal unity scenarios.
- International overlays: VAT/OSS, DAC6, Pillar Two, Treaty WHT/MAP, US overlays.
- Verify governance packs and approvals for each module.

**Day 3 – Accounting & Close**
- Ledger import, journal workflow, reconciliation lifecycle, trial balance snapshot.
- Consolidation workspace run with eliminations.
- Disclosure composer + ESEF export, archive manifest sync.

### UAT Scripts & Artefacts
- Detailed scripts stored in `/docs/UAT/` (create subfolder per day).
- Capture screenshots, key outputs (PDF, Inline XBRL, CSV exports), and ActivityLog IDs.
- Partners sign off using the approval matrix (MANAGER → PARTNER → EQR where applicable).

## Launch Readiness Checklist
- Confirm all performance tests meet SLA; attach reports in `/docs/PERF/`.
- UAT sign-off forms stored in `/docs/UAT/signoff-<date>.md`.
- Rotate keys, verify monitoring dashboards, run `npm run coverage`, and `psql scripts/test_policies.sql`.
- Run the production readiness checklist (`PRODUCTION_READINESS_CHECKLIST.md`) with sign-off from Partner & DevOps.
