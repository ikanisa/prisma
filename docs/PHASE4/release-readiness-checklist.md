# Phase 4 Release Readiness Checklist

Complete this checklist after performance testing, security review, and UAT have been signed off. Attach evidence links for each item. Store a dated copy (e.g., `docs/PHASE4/release-readiness-2024-09-15.md`) and include it in the production launch ticket.

---

## 1. Performance & Load Testing

| Item | Status | Evidence / Link |
| --- | --- | --- |
| Performance runbook executed (`docs/PHASE4/performance-runbook.md`) |  |  |
| All SLA targets met (`95th percentile < targets`) |  |  |
| Policy regression post-tests |  |  |
| Coverage report archived |  |  |
| Grafana / Supabase metrics captured |  |  |

---

## 2. Security Review

| Item | Status | Evidence / Link |
| --- | --- | --- |
| Security checklist completed (`docs/PHASE4/security-review-checklist.md`) |  |  |
| Secrets inventory verified |  |  |
| Dependency & lint/type checks clean |  |  |
| Pen test / threat drill actions closed |  |  |

---

## 3. UAT & Partner Sign-off

| Item | Status | Evidence / Link |
| --- | --- | --- |
| Day 1 audit scripts completed (`docs/UAT/day-1-audit.md`) |  |  |
| Day 2 tax scripts completed (`docs/UAT/day-2-tax.md`) |  |  |
| Day 3 accounting scripts completed (`docs/UAT/day-3-accounting.md`) |  |  |
| UAT sign-off template filled (`docs/PHASE4/uat-signoff-template.md`) |  |  |

---

## 4. Production Controls

| Item | Status | Evidence / Link |
| --- | --- | --- |
| `PRODUCTION_READINESS_CHECKLIST.md` completed |  |  |
| `/api/release-controls/check` executed and stored |  |  |
| Archive manifest verified (`archive-rebuild` scenario) |  |  |
| Evidence bundle created (`npm run archive:phase4`) |  |  |
| Telemetry & alerting dashboards reviewed |  |  |
| Backups & PITR status confirmed |  |  |

---

## 5. Final Approvals

| Role | Name | Sign-off | Date | Notes |
| --- | --- | --- | --- | --- |
| Audit Partner |  |  |  |  |
| Tax Partner |  |  |  |  |
| Accounting Lead |  |  |  |  |
| DevOps Lead |  |  |  |  |
| Security Lead |  |  |  |  |

---

**Instructions**
1. Populate the table with links to evidence (logs, screenshots, Jira tickets).
2. Attach the completed checklist and supporting documents to the release ticket / change record.
3. Update `IMPLEMENTATION_PLAN.md` Phase 4 status to reflect completion.
4. Retain artefacts for audit/compliance.
