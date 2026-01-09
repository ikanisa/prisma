# Implementation Plan — Autonomous Audit, Tax, Accounting AI

This plan operationalizes the Prisma Repository Enhancement Report and aligns it to the existing repository architecture, guardrails, and data model. It is written to be actionable (phases, epics, user stories) and to reconcile current repo constraints with the new direction.

## Alignment Notes (Existing Docs)
- Architecture baseline: `ARCHITECTURE.md`
- Data model + RLS expectations: `DATA_MODEL.md`
- Agent design + orchestration roadmap: `docs/agents/architecture.md`
- Autonomy delivery blueprint: `docs/autonomous-finance-suite-plan.md`
- Discovery gaps: `docs/phase-one-discovery.md`
- Guardrails + HITL policy: `AGENT-GUARDRAILS.md`
- Definition of Done (jurisdiction and scope constraints): `docs/definition-of-done.md`

### Document Gaps to Resolve
The following references appear in docs but are missing in the repo. Track them as Phase 1 backlog items.
- `ENDPOINTS_AND_WORKFLOWS.md`
- `IMPLEMENTATION_PLAN.md` (this file now fills the gap)
- References to `server/` FastAPI files in older plans

## Phase Crosswalk (Report -> Repo)
- Report Phase 1 (Months 1-4) == `docs/autonomous-finance-suite-plan.md` Phases A/B
- Report Phase 2 (Months 5-8) == `docs/autonomous-finance-suite-plan.md` Phase C
- Report Phase 3 (Months 9-12) == `docs/autonomous-finance-suite-plan.md` Phase D + Phase 5 ops runbook
- Report Phase 4 (Months 13-18) == Post-Phase D innovation + market expansion

## Phase 1 — Foundation & Orchestration (Months 1-4)
Goal: Ship the multi-agent foundation, autonomy controls, deterministic evidence contracts, and MVP automation flows.

### Epic P1-E1: Agent Orchestration & Communication
- Story P1-E1-S1: As a platform owner, I can define a standard inter-agent message schema so domain agents exchange structured events.
  - Acceptance: Message schema includes task type, context, priority, autonomy mode, and correlation IDs; unit tests cover publish/subscribe behavior.
- Story P1-E1-S2: As a Director agent, I can route tasks to specialist agents with traceability.
  - Acceptance: Orchestrator emits a trace ID for each routed task; events are stored with agent/engagement context.

### Epic P1-E2: Autonomy & HITL Controls
- Story P1-E2-S1: As a manager, I can set autonomy levels (L0-L3) per organization with enforced floors/ceilings.
  - Acceptance: Autonomy levels are validated against role hierarchy; UI shows allowed autopilot jobs.
- Story P1-E2-S2: As a reviewer, I can approve or reject high-risk agent actions before they execute.
  - Acceptance: Approval requests include evidence links and are logged in the approval queue; rejections block execution.

### Epic P1-E3: Deterministic Computation Contracts
- Story P1-E3-S1: As an auditor, I can see inputs/outputs and hash manifests for deterministic calculations.
  - Acceptance: Each deterministic job emits a manifest with inputs, outputs, hash, and evidence references.
- Story P1-E3-S2: As a platform owner, I can detect missing manifests via telemetry.
  - Acceptance: Missing manifest events trigger alerts and appear in autonomy dashboards.

### Epic P1-E4: Document Intake & Evidence Automation (MVP)
- Story P1-E4-S1: As a client user, I can upload documents and see extraction status.
  - Acceptance: Upload triggers extraction; status transitions are visible in the UI.
- Story P1-E4-S2: As a preparer, I can map extracted fields to onboarding tasks.
  - Acceptance: Extracted fields populate drafts with provenance links; reviewers can accept/reject.

### Epic P1-E5: Tax Nexus Monitoring (MVP)
- Story P1-E5-S1: As a tax manager, I can monitor jurisdiction thresholds and receive alerts when nearing nexus.
  - Acceptance: Threshold rules are versioned; alerts include jurisdiction, period, and recommended actions.
- Story P1-E5-S2: As a compliance reviewer, I can require approval before registration or filing is scheduled.
  - Acceptance: Nexus-triggered filings require approval and log the decision.

### Epic P1-E6: Audit Evidence Automation (MVP)
- Story P1-E6-S1: As an auditor, I can request evidence and see automated matching suggestions.
  - Acceptance: Evidence requests generate tasks; matched evidence references appear in workpapers.
- Story P1-E6-S2: As a reviewer, I can approve evidence mappings.
  - Acceptance: Approval workflow gates evidence linkage and logs decisions.

### Epic P1-E7: Security & Governance Baseline
- Story P1-E7-S1: As security, I can enforce tool allow-lists and audit every tool call.
  - Acceptance: Tool registry enforces allow-list; logs include tool, input hash, and trace ID.
- Story P1-E7-S2: As compliance, I can export audit trails for autonomy actions.
  - Acceptance: Export includes approvals, evidence hashes, and agent trace IDs.

Phase 1 Exit Criteria
- Agent message protocol and routing stable
- Autonomy guardrails enforced and visible in UI
- Deterministic manifests emitted for core jobs
- Document ingestion + extraction wired end-to-end

## Phase 2 — Core Feature Expansion (Months 5-8)
Goal: Expand audit, tax, and accounting automation to parity with market leaders.

### Epic P2-E1: Global Tax Automation (Sphere-level)
- Story P2-E1-S1: As a tax lead, I can run nexus and taxability across 100+ jurisdictions.
  - Acceptance: Jurisdiction rulesets are versioned and validated; coverage dashboard is available.
- Story P2-E1-S2: As a filer, I can auto-generate returns with pre-submission validation.
  - Acceptance: Filing engine produces draft returns; validation errors are surfaced with remediation steps.

### Epic P2-E2: Audit Automation (AuditBoard/DataSnipper parity)
- Story P2-E2-S1: As an audit manager, I can auto-map trial balances and generate lead schedules.
  - Acceptance: TB mapping produces lead schedules with mapping confidence and review gates.
- Story P2-E2-S2: As a reviewer, I can see continuous monitoring alerts tied to risks.
  - Acceptance: Alerts include risk linkage, evidence, and recommended procedures.

### Epic P2-E3: Accounting Close Automation
- Story P2-E3-S1: As a controller, I can trigger close autopilot runs with approvals.
  - Acceptance: Close workflow executes deterministic steps and queues approvals for postings.
- Story P2-E3-S2: As a reviewer, I can see close status and bottlenecks in real time.
  - Acceptance: Close dashboard shows step status, blockers, and ETA.

### Epic P2-E4: Integration Hub (Core ERP + Billing)
- Story P2-E4-S1: As an admin, I can connect QuickBooks, Stripe, and Xero with incremental syncs.
  - Acceptance: OAuth flows are supported; sync logs show incremental updates and failures.
- Story P2-E4-S2: As a tax analyst, I can reconcile transactions across sources.
  - Acceptance: Reconciliation view highlights mismatches with evidence links.

Phase 2 Exit Criteria
- Tax + audit + accounting automation available for pilot tenants
- Integration hub active for core systems
- Continuous monitoring and evidence automation operational

## Phase 3 — Advanced Intelligence & Scale (Months 9-12)
Goal: Expand autonomy, continuous monitoring, and global compliance coverage at scale.

### Epic P3-E1: Specialized Agent Network
- Story P3-E1-S1: As a Director agent, I can delegate tasks to 10+ specialized agents.
  - Acceptance: Agent registry includes tax, audit, accounting, and research specialists with tool catalogs.
- Story P3-E1-S2: As a reviewer, I can see provenance for every agent decision.
  - Acceptance: Outputs include citations, confidence scores, and evidence hashes.

### Epic P3-E2: Continuous Monitoring 24x7
- Story P3-E2-S1: As a risk owner, I can receive anomaly alerts within 5 minutes of ingestion.
  - Acceptance: Streaming pipeline emits alerts and logs with SLA metrics.
- Story P3-E2-S2: As an auditor, I can downgrade autonomy when risk scores spike.
  - Acceptance: Autonomy levels auto-adjust; overrides are logged.

### Epic P3-E3: Global Tax & Multi-GAAP Support
- Story P3-E3-S1: As a tax lead, I can run VAT/GST for EU, UK, CA, AU, and India.
  - Acceptance: Returns are generated per jurisdiction with localized rules.
- Story P3-E3-S2: As finance, I can generate IFRS and US GAAP statements.
  - Acceptance: Statement templates output XBRL-ready tagging.

Phase 3 Exit Criteria
- Multi-agent orchestration stable at scale
- Global tax + multi-GAAP coverage at production quality
- Continuous monitoring with autonomous downgrades

## Phase 4 — Market Leadership & Enterprise (Months 13-18)
Goal: Enterprise-grade scale, predictive intelligence, and new differentiators.

### Epic P4-E1: Predictive Analytics & Forecasting
- Story P4-E1-S1: As a CFO, I can view audit risk forecasts 12 months ahead.
  - Acceptance: Forecasts use historical data and provide confidence intervals.
- Story P4-E1-S2: As a tax lead, I can view multi-jurisdiction liability forecasts.
  - Acceptance: Forecasts include scenario drivers and sensitivity analysis.

### Epic P4-E2: Enterprise Compliance & Certifications
- Story P4-E2-S1: As compliance, I can complete SOC 2 Type II and ISO 27001 evidence packs.
  - Acceptance: Evidence packs map controls to logs, policies, and audit trails.
- Story P4-E2-S2: As security, I can enforce multi-region data residency.
  - Acceptance: Regional storage and processing constraints are enforced.

### Epic P4-E3: Advanced Automation (Optional)
- Story P4-E3-S1: As an enterprise client, I can use voice/vision workflows for document capture.
  - Acceptance: OCR pipelines support receipts/invoices with provenance tracking.
- Story P4-E3-S2: As an auditor, I can verify immutable audit trails.
  - Acceptance: Externalized audit trail storage is tamper-evident and queryable.

Phase 4 Exit Criteria
- Enterprise compliance achieved
- Predictive intelligence in production
- Differentiators validated with lighthouse customers

## Decision Gates
- Jurisdiction Scope: Align `docs/definition-of-done.md` with global expansion goals; update RLS and playbooks accordingly.
- Architecture Source of Truth: Resolve outdated references to missing `server/` files or merge with current runtime.
- Evidence Policy: Confirm retention, privacy, and audit trail requirements per jurisdiction before enabling L3/L4 autonomy.

## Backlog Hygiene
- Every epic requires measurable acceptance criteria and tests.
- Any schema change must update `DATA_MODEL.md` and RLS documentation.
- Any new tool must be added to `AGENT-GUARDRAILS.md` allow-list and agent manifest registry.
