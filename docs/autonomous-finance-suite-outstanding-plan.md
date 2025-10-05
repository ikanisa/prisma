# Autonomous Finance Suite – Outstanding Delivery Plan

## 1. Scope Summary
The remaining backlog centres on the audit fieldwork modules and the final hardening checklist captured in the original implementation roadmap:
- **CTRL‑1 Controls Matrix & ITGC** – schema, APIs, UI workflows, and ISA traceability remain open items.【F:IMPLEMENTATION_PLAN.md†L60-L63】
- **ADA‑1 Deterministic Analytics Kernel** – analytics runners, UI, and ATT evidence logging are still pending delivery.【F:IMPLEMENTATION_PLAN.md†L64-L70】
- **REC‑1 Reconciliation Workbench** – matching engine, workbench UI, and misstatement linkage need completion beyond the existing skeleton.【F:IMPLEMENTATION_PLAN.md†L72-L80】
- **Release Hardening Tasks** – performance/load testing, security review, UAT/training, and the production launch checklist are outstanding gating activities.【F:IMPLEMENTATION_PLAN.md†L132-L138】

These items must be executed while keeping sampling utilities, misstatement registers, and approvals queues aligned with prior phases.

## 2. Phased Implementation Approach

### Phase A – CTRL‑1 Controls Matrix & ITGC (Estimated 1.5 weeks)
**Objectives**
- Deliver the controls schema, CRUD APIs, walkthrough/test tooling, and UI matrix so auditors can document, test, and escalate deficiencies.

**Key Activities**
1. Finalise Supabase migration `audit_CTRL1_schema.sql` with triggers, enums, and RLS aligned to the shared audit base schema; extend generated types.
2. Implement FastAPI endpoints (`/api/controls/*`, `/api/controls/tests/run`, `/api/deficiencies/*`) with activity logging and sampling hooks.
3. Build React matrix grid, walkthrough modal, testing panel, and deficiency banner leveraging existing audit workspace shell.
4. Update ATT/ISA traceability matrix and knowledge docs for walkthrough/test procedures.

**Dependencies**
- Sampling utilities delivered during Phase 0.
- Activity log hooks and deficiency register from existing audit modules.

**Exit Criteria & Validation**
- Migration deploys to staging with RLS tests for EMPLOYEE/MANAGER/PARTNER roles.
- Postman regression executes three control scenarios, runs a ≥25 sample, and records a deficiency automatically routed to TCWG.
- UI smoke test confirms cycle filtering, attribute selection, and deficiency banners.
- Traceability matrix entries for ISA 315/330/265 signed off.

### Phase B – ADA‑1 Deterministic Analytics Kernel (Estimated 1.5 weeks)
**Objectives**
- Provide deterministic analytics runs with ATT evidence artefacts and UI workflows feeding sampling and JE testing.

**Key Activities**
1. Ship `audit_ADA1_schema.sql` migration with ADARun/ADAException tables, dataset hash lineage, and RLS policies.
2. Implement analytics runners (JE scoring, ratio/variance, duplicates, Benford) with deterministic configuration, sampling integration, and CLI harness for regression data sets.
3. Expose FastAPI endpoints (`/api/analytics/*`) and attach ATT manifest generation plus structured logging (`ADA_RUN_STARTED/COMPLETED`).
4. Build Analytics tab UI cards with parameter capture, results tables, CSV export, and “Send to Sampling/JE Testing” actions.

**Dependencies**
- CTRL‑1 sampling utilities and deficiency escalation (Phase A).
- Existing JE testing and misstatement modules for downstream integration.

**Exit Criteria & Validation**
- Schema migration + pgTAP/pytest coverage verifying RLS and dataset hash persistence.
- CLI regression pack runs multiple rules, producing deterministic outputs and ATT manifests stored with provenance.
- UI manual test executes JE risk run, reviews exceptions, exports CSV, and pushes an item to sampling.
- Telemetry reflects analytics lifecycle events and sampling linkage.

### Phase C – REC‑1 Reconciliation Workbench (Estimated 2 weeks)
**Objectives**
- Complete the reconciliation engine, UI workbench, and misstatement integration for bank, AR, and AP scopes.

**Key Activities**
1. Deliver `audit_REC1_schema.sql` with bank/AR/AP tables, ledger lines, and evidence pointers; align Supabase types and RLS tests.
2. Implement matching engine services covering exact, tolerance-based, and fuzzy matches with unresolved ledger persistence and PDF evidence generation.
3. Build reconciliation UI (statement import, auto-match review, manual resolve workflow, export schedule) integrated into audit workspace shell.
4. Connect unresolved items to misstatement register and TCWG pack, ensuring approval workflows fire for proposed adjustments.

**Dependencies**
- ADA‑1 exports for data ingestion.
- Existing misstatement register APIs and TCWG reporting surfaces.

**Exit Criteria & Validation**
- Bank/AR/AP acceptance scenario passes: ingest sample statements, auto-match, leave unresolved items triggering misstatement entry.
- PDF evidence packs generated with checksum recorded in evidence manifest.
- UI manual regression completes recon workflow end-to-end and confirms TCWG pack linkage.
- Performance profile captures matching engine benchmarks for large datasets (baseline for Phase D tests).

### Phase D – Release Hardening & Launch Readiness (Estimated 1.5 weeks)
**Objectives**
- Execute the outstanding performance, security, UAT, and launch readiness activities prior to production enablement.

**Key Activities**
1. **Performance & Load Testing** – Run scaled ADA/REC workloads, profile Supabase policies, and capture SLA metrics; automate via CI job.
2. **Security Review** – Conduct targeted pen test on new audit endpoints, verify signed URL expiries, and review audit logs; document findings and remediation.
3. **UAT & Training** – Script UAT scenarios for CTRL‑1/ADA‑1/REC‑1, run partner-led sessions, collect feedback, and update docs/playbooks.
4. **Production Launch Checklist** – Execute PRODUCTION_READINESS_CHECKLIST.md, confirm telemetry dashboards, alerting, backup plans, and approvals sign-off.

**Dependencies**
- Completion of Phases A–C delivering functional modules for testing.
- Existing telemetry dashboards and release control APIs.

**Exit Criteria & Validation**
- Load test report demonstrates ≤ defined SLA at 95th percentile with no RLS regressions.
- Security review closed with zero critical findings and tracked mitigations.
- Signed UAT report with training materials published in `/docs`.
- Launch checklist signed by Partner and DevOps, referencing release control readiness API outputs.

## 3. Cross-Cutting Considerations
- **Testing & Automation** – Extend pytest/Vitest coverage for new modules, integrate load/performance suites, and ensure CI gating across migrations.
- **Change Management** – Use feature flags to stage CTRL‑1/ADA‑1/REC‑1 into pilot tenants before broad release; maintain rollback playbooks.
- **Telemetry & Evidence** – Emit structured events for controls, analytics, and reconciliation actions; ensure evidence manifests capture provenance and signed URL TTL compliance.
- **Resource Planning** – Secure sampling service support and security review bandwidth ahead of Phases A and D to avoid schedule slips.

This plan prioritises completion of the remaining audit modules before executing the final hardening gate, providing clear acceptance criteria and dependencies to guide delivery sequencing.
