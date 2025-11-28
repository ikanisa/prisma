# Phase 5 – Production Operations Runbook

Once Phase 4 hardening activities are complete and the release readiness checklist is signed, the programme enters Phase 5: steady-state production operations and continuous improvement. This runbook defines the recurring activities, on-call expectations, and operational metrics that must be sustained post-launch.

---

## 1. Operational Cadence

| Cadence | Activities | Owner(s) | Artefacts |
| --- | --- | --- | --- |
| Daily | Review telemetry dashboard (SLAs, refusal rates, Supabase health), triage Sentry / Supabase errors, confirm overnight jobs succeeded (`/api/release-controls/check`). | On-call engineer | `docs/OPERATIONS/daily-checklist.md` |
| Weekly | Close/autonomy backlog grooming, cost monitoring vs budget, ensure rate-limit baselines intact, rotate temporary access tokens. | Eng Manager, FinOps | `reports/week-<iso>.md` |
| Monthly | Run archive manifest verification, PITR backup restore drill (staging), review RLS policy changes & access logs. | DevOps + Security | `docs/SECURITY/monthly-controls.md` |
| Quarterly | Perform threat drill (tabletop + runbook), refresh SOC/ISA traceability matrix, review regulatory updates (tax / audit). | Security + Product | `docs/SECURITY/threat-drills.md`, `STANDARDS/TRACEABILITY/matrix.md` |
| Retention & evidence upkeep | Maintain traceability artefacts, archive Phase 4 evidence, update policy packs with regulatory changes. | Compliance lead | `docs/OPERATIONS/traceability-upkeep.md` |

---

## 2. Monitoring & Alerting

- **Telemetry dashboards:** Ensure Grafana boards for SLA coverage, refusal counts, and Supabase performance remain green. Action when thresholds exceed 80% of error budget.
- **Alert routing:** PagerDuty escalation policies must include Audit Partner for production release blockers. Confirm contact roster monthly.
- **Log aggregation:** Structured logs (`context.requestId`, `orgId`, `engagementId`) must flow to the central log sink; verify filters remain in place.

---

## 3. Incident Response

1. Follow `docs/SECURITY/incident-response.md` for severity classification.
2. Open a war-room channel and assign an Incident Commander.
3. Capture timelines and remediation steps in `docs/OPERATIONS/incidents/incident-<date>.md`.
4. After resolution, schedule a post-mortem within 5 business days; update runbooks and tests as needed.

---

## 4. Change Management

- All Supabase schema changes continue to flow through migrations with staging validation (`supabase db start`). Tag releases with the corresponding migration hash.
- For runtime feature flags, document intended states in `services/rag/system-config.ts` and log each change via approval queue.
- Maintain a rolling 7-day change calendar; freeze windows require Partner approval.

---

## 5. Compliance & Evidence

- Retain Phase 4 artefacts (performance, security, UAT) and append new evidence in `docs/SECURITY/evidence/<date>/`.
- Audit readiness: update `STANDARDS/TRACEABILITY/matrix.md` after any control/coverage change.
- Data retention: confirm storage buckets respect TTL and purge schedules; re-run the retention task monthly.

---

## 6. Continuous Improvement Backlog

| Theme | Examples | Tracking |
| --- | --- | --- |
| Observability enhancements | Additional SLOs, synthetic tests, Sentry releases | Jira board `OPS` |
| Automation | Self-healing scripts for stuck jobs, automatic seed resets | `ops-automation` epic |
| Cost optimisation | Storage lifecycle tuning, compute scaling | FinOps spreadsheet |
| Regulatory updates | New tax rules, audit standards | `STANDARDS/POLICY/*` |

Review backlog items during the weekly operations meeting and reprioritise as needed.

---

## 7. Sign-off

Before fully transitioning to Phase 5, confirm:

- Phase 4 checklists are complete and committed.
- On-call roster acknowledges the runbook.
- Partners approve the operational cadence.

Record the transition in `DECISIONS.md` (include meeting notes and signatories).

Maintain this runbook as living documentation—update whenever tooling, cadence, or ownership changes.
