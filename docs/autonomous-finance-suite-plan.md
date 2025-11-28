# Autonomous Finance Suite – Delivery Blueprint

## 1. Context and Design Drivers
- The existing programme already hardens Supabase access, CI, logging, and approval guardrails across audit, tax, and accounting domains, giving us a stable baseline for additional automation layers.【F:IMPLEMENTATION_PLAN.md†L6-L146】
- Current data structures span end-to-end audit, close, and tax records with tenant-aware row-level security, ensuring we can enforce the suite's RBAC/segregation mandates without first redesigning storage primitives.【F:DATA_MODEL.md†L7-L71】
- Web/API capabilities already expose deterministic analytics, reconciliation, audit governance, and tax computation endpoints we can orchestrate through higher-level “autonomous” playbooks rather than rebuilding primitives.【F:ENDPOINTS_AND_WORKFLOWS.md†L9-L205】

**Implication:** We focus early effort on orchestration (agents, workflows, document intelligence) and policy overlays (RLS/RBAC, approvals, evidence tracking) that align with the new zero-typing onboarding, deterministic math, and autonomy level requirements described in the Autonomous Finance Suite brief.

## 2. Gap Assessment
| Requirement Theme | Existing Capability | Gap | Remediation Focus |
| --- | --- | --- | --- |
| Document-first onboarding | Audit/tax document ingestion, PBC pipelines, evidence manifests exist but require manual initiation and back-office handling.【F:IMPLEMENTATION_PLAN.md†L48-L104】【F:ENDPOINTS_AND_WORKFLOWS.md†L129-L205】 | Need guided dropzones, auto-classification, acceptance loop, and repository seeding that aligns with zero-typing playbook. | Extend onboarding workflow, doc AI pipeline, and notifications to cover end-user prompts, provenance, and auto repository creation.
| Deterministic computations | ADA analytics, reconciliation engines, tax calculators, and telemetry enforce deterministic pipelines with ATT manifests.【F:IMPLEMENTATION_PLAN.md†L64-L145】【F:ENDPOINTS_AND_WORKFLOWS.md†L63-L205】 | Need unifying governance so orchestrated agents consistently store hashes, manifests, and cross-module provenance. | Introduce deterministic computation contracts (hashing, ATT references) across orchestration workflows.
| RBAC & RLS enforcement | Global RLS templates and approval queues already cover audit/tax modules.【F:IMPLEMENTATION_PLAN.md†L25-L152】【F:DATA_MODEL.md†L45-L71】 | Need expanded matrix for new autonomy levels, client portal scoping, and service accounts per suite spec. | Update policy packs, membership roles, and enforcement tests; ensure portal segregation matches repository whitelist.
| Autonomy levels & human-in-the-loop | Approval queue + submission endpoints support manual gates.【F:IMPLEMENTATION_PLAN.md†L47-L152】【F:ENDPOINTS_AND_WORKFLOWS.md†L9-L205】 | Need configurable autonomy modes (L0-L3), evidence verification before auto actions, and UX that surfaces suggested actions with user confirmation. | Build autonomy controller, extend approval workflows with autonomy metadata, and expose assistant UX components.
| Knowledge & retrieval | Knowledge ingestion placeholders exist with environment-driven activation, but orchestration remains manual.【F:README.md†L34-L78】 | Need hybrid retrieval + provenance enforcement per new evidence policy. | Wire knowledge services into agent orchestrations with provenance gating.

## 3. Phased Implementation Plan

### Phase A – Foundation & Governance (Weeks 0-2)
1. **Autonomy Policy Framework**
   - Extend role matrix (`memberships`, `approval_queue`) to encode autonomy levels, service accounts, and client-portal scoping; include migration + pgTAP coverage for new constraints.【F:DATA_MODEL.md†L13-L71】
   - Update security policy packs and approval matrix documentation to reflect new actions and enforced human-in-the-loop checkpoints.【F:IMPLEMENTATION_PLAN.md†L25-L152】
2. **Deterministic Execution Contract**
   - Standardise manifest schema (hash, inputs, outputs, evidence doc IDs) for all deterministic jobs (ADA, reconciliations, tax) and publish shared library hooks for agents to invoke.【F:IMPLEMENTATION_PLAN.md†L64-L145】
   - Instrument telemetry to flag missing manifests and tie alerts into existing monitoring runbooks.【F:IMPLEMENTATION_PLAN.md†L25-L33】【F:IMPLEMENTATION_PLAN.md†L147-L152】
3. **Document Intelligence Hardening**
   - Formalise doc AI ingestion pipeline with provenance metadata, mapping extracted fields to entity creation and tasks per onboarding workflow requirements.【F:IMPLEMENTATION_PLAN.md†L48-L104】【F:ENDPOINTS_AND_WORKFLOWS.md†L129-L205】
   - Expand rate-limit and signed-URL policies to cover new onboarding dropzones and zero-trust ingress paths.【F:IMPLEMENTATION_PLAN.md†L25-L33】【F:IMPLEMENTATION_PLAN.md†L147-L152】

**Exit Criteria:** Updated RBAC tests, telemetry alerts, and doc ingestion flows deployed to staging; policy documentation refreshed; autonomy level toggles exposed for admin testing.

#### Phase A Implementation Status (2025-10-05)
- Supabase `memberships` now persist autonomy floor/ceiling metadata, service account flags, and client portal scoping arrays with pgTAP coverage to guard migrations. Application handlers hydrate these fields so autopilot scheduling/enqueuing enforces both organisational autonomy and membership ceilings.
- Deterministic contract helper emits manifests (hash, inputs, outputs, evidence) for autopilot runs; `_finalise_autopilot_job` validates hashes and raises `telemetry_alerts` rows when manifests are missing or malformed.
- Document AI ingestion aggregates mapped profile fields and provenance into `company_profile_drafts.provenance` while onboarding commit collates tax/close task seeds for follow-on automation. Rate limits and signed URL policies include dedicated onboarding dropzone settings.

### Phase B – Workflow Orchestration & UX (Weeks 3-6)
1. **Onboarding “Zero-Typing” Journey**
   - Implement assistant-driven checklist UI, dropzones, and progress tracker tied to document ingestion endpoints, automatically mapping accepted extracts to entity creation and repository seeding.【F:IMPLEMENTATION_PLAN.md†L48-L104】【F:ENDPOINTS_AND_WORKFLOWS.md†L129-L205】
   - Integrate notifications and task seeding so acceptance triggers downstream close and compliance tasks already present in the system.【F:IMPLEMENTATION_PLAN.md†L48-L146】
2. **Autonomy Controller UI Components**
   - Surface autonomy state (L0-L3), evidence status, and approval requirements in dashboard shells, reusing audit workspace layout and approvals banner components.【F:IMPLEMENTATION_PLAN.md†L50-L53】【F:IMPLEMENTATION_PLAN.md†L147-L152】
   - Add “next two suggested actions” capability by orchestrating existing API endpoints into assistant prompts with provenance links.【F:ENDPOINTS_AND_WORKFLOWS.md†L9-L205】
3. **Agent Tooling Integration**
   - Wire orchestration agents to deterministic endpoints (recon, analytics, tax) ensuring manifest capture and RBAC checks before job execution.【F:ENDPOINTS_AND_WORKFLOWS.md†L63-L205】
   - Implement failure handling leveraging existing error notification workflow to maintain human-in-the-loop accountability.【F:IMPLEMENTATION_PLAN.md†L9-L24】

**Exit Criteria:** Usability test of onboarding journey, autonomy HUD integrated into dashboards, assistant suggestions producing audited actions with manifests and approval trails.

#### Phase B Implementation Status (2025-10-19)
- Zero-typing onboarding workspace now pairs the document checklist with a conversational agent, live progress tracking, and follow-up task seeding when managers commit the intake flow.
- Autonomy HUD surfaces organisation autonomy bands, manifest telemetry, pending approvals, and the next two assistant-triggerable workflow steps directly within the shell.
- Onboarding commit pipeline provisions downstream tasks, notifications, and manifest-backed provenance so deterministic jobs remain auditable.

### Phase C – Cross-Domain Automation (Weeks 7-11)
1. **Accounting Close Autopilot**
   - Orchestrate close snapshot, reconciliations, JE analytics, and variance analyses behind autonomy-aware workflows that queue approvals before postings.【F:IMPLEMENTATION_PLAN.md†L64-L146】【F:ENDPOINTS_AND_WORKFLOWS.md†L177-L205】
   - Extend telemetry dashboards to display autonomy outcomes (auto-prepared vs manual) and SLA adherence.【F:IMPLEMENTATION_PLAN.md†L147-L152】
2. **Audit Fieldwork Automation**
   - Chain controls, analytics, reconciliations, group audit, and TCWG packs into progressive autonomy flows with evidence manifests and approval gating.【F:IMPLEMENTATION_PLAN.md†L55-L104】【F:ENDPOINTS_AND_WORKFLOWS.md†L9-L205】
   - Embed risk-based triggers (from `audit_risk_signals`) to throttle autonomy when evidence confidence drops, invoking human review.【F:DATA_MODEL.md†L30-L34】
3. **Tax Cycle Orchestration**
   - Sequence CIT, VAT, DAC6, Pillar Two, and US overlay computations with deterministic manifest enforcement and approval queue integration per autonomy level.【F:IMPLEMENTATION_PLAN.md†L106-L130】【F:ENDPOINTS_AND_WORKFLOWS.md†L180-L205】
   - Publish governance pack updates to capture refusal rules and autonomy overrides for filings.【F:IMPLEMENTATION_PLAN.md†L127-L130】

**Exit Criteria:** Cross-domain autopilot demos executed in staging with manifest proofs, autonomy downgrade rules validated, and approvals captured before external outputs.

#### Phase C Implementation Status (2025-10-26)
- Accounting close autopilot now stages the month-end workflow up to the lock step, generating deterministic manifests, surfacing pending approvals, and capturing telemetry coverage per run.
- Audit fieldwork automation chains the external audit workflow with autonomy-aware progression and aggregates domain alerts so risk-triggered downgrades can be actioned before partner approvals.
- Tax cycle orchestration sequences CIT, VAT, DAC6, and Pillar Two computations with manifest evidence and approval queue visibility, exposing the outcomes to the autonomy HUD.

### Phase D – Compliance, Performance & Release (Weeks 12-13)
1. **Safety Net Expansion**
   - Extend load/security testing scenarios to cover autonomy-triggered bursts, document ingestion spikes, and archive rebuilds.【F:IMPLEMENTATION_PLAN.md†L135-L146】
   - Run regression of RLS/RBAC suites and update traceability matrix for new autonomy features.【F:IMPLEMENTATION_PLAN.md†L25-L152】
2. **Operational Playbooks**
   - Update observability, backup, and release runbooks with autonomy-specific alerts and rollback guidance.【F:IMPLEMENTATION_PLAN.md†L25-L33】【F:IMPLEMENTATION_PLAN.md†L135-L146】
   - Deliver training/UAT materials demonstrating autonomy levels, evidence verification, and manual override procedures.【F:IMPLEMENTATION_PLAN.md†L135-L146】
3. **Go-Live Checklist**
   - Execute production readiness checklist with focus on autonomy toggles, MFA gating for irreversible actions, and telemetry validation.【F:IMPLEMENTATION_PLAN.md†L135-L146】

**Exit Criteria:** Signed production readiness report, updated runbooks, and autonomy guardrails verified under load and security testing.

#### Phase D Implementation Status (2025-11-09)
- Release controls now surface autonomy, MFA, and telemetry readiness in a single response, backed by expanded pgTAP coverage for `jobs`, `job_schedules`, and `mfa_challenges` plus pytest assertions that flag worker disablement or stale challenges.
- Phase D load profiles add autonomy bursts, document-ingestion spikes, and archive rebuilds to the k6 catalogue so staging evidence covers the new guardrails before sign-off.
- Observability, backup, release, and rollback runbooks reference the autonomy environment check, worker toggles, and new training/UAT materials covering manual overrides and telemetry validation.

## 4. Risk Register
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Autonomy misconfiguration bypassing approvals | Regulatory breach, client exposure | Enforce autonomy level floor per role in database, block execution when manifests or approvals missing; monitor via telemetry alerts.【F:DATA_MODEL.md†L45-L71】【F:IMPLEMENTATION_PLAN.md†L147-L152】 |
| Document AI extraction drift | Incorrect onboarding data | Maintain provenance and acceptance workflow requiring user confirmation before commit; expand tests on extraction mappings.【F:IMPLEMENTATION_PLAN.md†L48-L104】 |
| Telemetry overload from orchestrated runs | Alert fatigue, hidden failures | Aggregate manifests and run status into existing telemetry dashboards with rate-limited notifications.【F:IMPLEMENTATION_PLAN.md†L25-L33】【F:IMPLEMENTATION_PLAN.md†L147-L152】 |

## 5. Success Metrics
- **Policy Compliance:** 100% of autonomous actions carry manifest hashes and approval audit trail in telemetry dashboard.【F:IMPLEMENTATION_PLAN.md†L147-L152】
- **Onboarding Efficiency:** 90% of required documents ingested through zero-typing flow with provenance captured in evidence utilities.【F:IMPLEMENTATION_PLAN.md†L48-L104】
- **Autonomy Adoption:** ≥70% of recurring close/tax workflows executed at L2 (auto-prepare) with no increase in approval rejections, tracked via activity log analytics.【F:IMPLEMENTATION_PLAN.md†L64-L146】

---
This blueprint sequences governance, orchestration, and automation enhancements to deliver the Autonomous Finance Suite while leveraging the robust foundations already present in the codebase.
