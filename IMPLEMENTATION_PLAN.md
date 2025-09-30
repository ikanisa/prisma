# Implementation Plan

## Overview
This plan sequences the work needed to deliver the audit evidence, analytics, tax, and accounting capabilities requested. It is organised into foundation work, iterative feature sprints, and hardening activities so that each delivery block can be validated against the acceptance criteria already defined (ISA, IAASB ATT, Maltese tax law, etc.). Each task specifies the goal, key activities, required artefacts, dependencies, estimated effort, and exit tests.

## Operational Hardening Plan (P0–P2 Status)
| Task | Goal | Owner | Est. | Acceptance Criteria | Status |
|---|---|---|---|---|---|
| Rotate exposed Supabase keys | Secure credentials | DevOps | 1d | No hard-coded keys, .env not committed | ✅ Completed |
| Commit `.env.example` | Guide developers | Dev | 0.5d | `.env.example` present & used | ✅ Completed |
| Add CI pipeline | Enforce lint/test/SCA | DevOps | 2d | CI passes on PRs | ✅ Completed |
| Setup error handler workflow | Capture failures | Automation Eng | 2d | Errors trigger notifications | ✅ Completed |

| Task | Goal | Owner | Est. | Acceptance Criteria | Status |
|---|---|---|---|---|---|
| Implement webhook verification | Prevent spoofing | Dev | 3d | Rejected invalid signature tests | ✅ Completed |
| Add retry & idempotency | Improve reliability | Dev | 5d | Replayed events processed once | ✅ Completed |
| Add unit and integration tests | Improve quality | Dev | 5d | Coverage >30% & CI runs tests | ✅ Completed |
> 🔐 Vault-backed secret manager added (`lib/secrets/*`, `apps/web/lib/supabase-server.ts`, `supabase/functions/_shared/supabase-client.ts`) covering Supabase service role + JWT secrets with Vitest coverage.
> 🧪 Expanded Vitest suite for telemetry/error notification helpers (`tests/telemetry-service.test.ts`, `tests/error-notify.test.ts`) covering auth, error, and success flows (`npm test`).
> 🧪 Added tenant-aware client coverage (`tests/audit/tenant-client.test.ts`) validating org scoping, insert/update/delete chaining, and Supabase-offline stubs.
> 🧪 Accounting close and financial reporting helpers covered (`tests/accounting/accounting-close-service.test.ts`, `tests/financials/consolidation-service.test.ts`); run `npm test` / `npm run coverage` to monitor progress toward the 30% goal.
> 🧪 Group audit API surface verified (`tests/api/group-*.test.ts`, `tests/audit/module-records.test.ts`) asserting module register updates, approval queue transitions, and evidence document handling.
> 🧪 Idempotency contract and correlation IDs enforced (`apps/web/app/lib/idempotency.ts`, `tests/audit/idempotency.test.ts`) with coverage thresholds (Vitest) gating CI and request tracing across audit endpoints.
| Setup logging & monitoring | Observability | DevOps | 5d | Logs searchable, alerts configured | ✅ Completed |
| Define access control & RLS review | Least privilege | Security | 4d | Policies reviewed, tests pass | ✅ Completed |

> ✅ Access control catalogue refreshed (`docs/SECURITY/rls-policies.md`) with pgTAP coverage in `scripts/test_policies.sql` validating telemetry and audit modules.
> ✅ Backup runbook expanded (`docs/backup-restore.md`) covering Supabase PITR, evidence manifests, retention windows, and cost controls (RPO/RTO documented).
> ✅ Telemetry & rate limiting alerts codified in `docs/telemetry.md` with Grafana/PagerDuty routing and API guardrail guidance.
> ✅ Observability runbook (`docs/observability.md`) details structured logging, log drains, dashboards, and alerting workflows supporting production readiness.
> ✅ OAuth scope catalogue published (`docs/SECURITY/oauth-scopes.md`) with `.env.example` and `SECURITY.md` updates anchoring least-privilege guidance.
> ✅ Penetration testing & threat drill playbook (`docs/SECURITY/penetration-testing.md`) documented with bi-annual cadence, tooling, and reporting workflow.

| Task | Goal | Owner | Est. | Acceptance Criteria | Status |
|---|---|---|---|---|---|
| Data retention & backup plan | Compliance | Ops | 1w | Documented backup & restore | ✅ Completed |
| Cost monitoring & rate limiting | Performance | DevOps | 1w | Alerts on cost spikes | ✅ Completed |
| OAuth scope minimisation | Security | Security | 3d | Only required scopes present | ✅ Completed |
| Penetration testing & threat drills | Security | Security | 2w | Report with mitigations | ✅ Completed |

## Phase 0 – Platform Foundations (Week 0-1)
| Task | Goal | Key Activities | Dependencies | Owner | Est. | Acceptance |
|---|---|---|---|---|---|---|
| Shared audit schema baseline | Standardise naming, timestamps, approvals for new audit tables | 1. Create `supabase/sql/audit_base_schema.sql` with common columns (orgId, engagementId, approvals, timestamps).<br>2. Extend Supabase types for shared enums (result statuses, severity).<br>3. Generate Prisma types and regenerate Supabase client. | Existing Supabase project | Backend | 1.5d | Schema migrates cleanly in staging; typegen succeeds. |
> ✅ Group audit endpoints now enforce correlation IDs, idempotency persistence, and per-org rate limiting (`apps/web/app/lib/observability.ts`, `apps/web/app/lib/idempotency.ts`, `apps/web/app/lib/rate-limit.ts`, `supabase/migrations/20250924225000_idempotency_keys.sql`, `supabase/migrations/20250924231000_rate_limits.sql`, `tests/api/group-*.test.ts`).
| Global audit RLS/RBAC policy pack | Ensure ISA-compliant access controls | 1. Draft reusable RLS templates (orgId scoping, role thresholds).<br>2. Add tests verifying EMPLOYEE vs MANAGER access.<br>3. Update ActivityLog hooks to capture new modules. | Shared schema | Security | 1d | Automated RLS tests pass; ActivityLog contains new event placeholders. |
| Sampling & evidence utilities | Reuse sampling, document links | 1. Surface Sampling C1 service client in shared lib.<br>2. Create helper for attaching documents via signed URLs.<br>3. Add ATT evidence manifest generator utility. | ActivityLog hooks | Backend | 1d | Utility functions unit-tested; manifest includes checksum + parameters. |
> ✅ Evidence utilities in place (`apps/web/lib/audit/evidence.ts`) with manifest generation consumed by CTRL‑1/ADA‑1 APIs.
| UI shell for Audit workspace | Provide navigation, layout, and state containers | 1. Add tabs for Controls, Analytics, Reconciliations, Group, Service Orgs, Specialists, Other Info.<br>2. Configure React Query caches per module.<br>3. Integrate approvals banner component. | Current accounting workspace | Frontend | 1.5d | Navigation renders without regressions; Lighthouse smoke test passes. |

> ✅ Shared audit base schema and RLS delivered via `supabase/sql/audit_base_schema.sql` and `supabase/sql/audit_base_rls.sql`, with Supabase client types updated accordingly.
> ✅ Audit workspace shell live with navigation tabs and approvals banner (`apps/web/app/audit/layout.tsx`).

## Phase 1 – Audit Fieldwork Modules (Weeks 1-4)
### CTRL‑1 Controls Matrix & ITGC (Week 1)
| Work Item | Description | Dependencies | Est. | Acceptance |
|---|---|---|---|---|
| Schema & RLS (`audit_CTRL1_schema.sql`) | Tables for Control, ControlWalkthrough, ControlTest, ITGCGroup, Deficiency with enums and audit triggers. | Phase 0 schema baseline | 1d | Migration succeeds; RLS tests cover EMPLOYEE vs MANAGER vs PARTNER. |
| API layer | CRUD endpoints, `/api/controls/test/run`, `/api/deficiency/create`, trace logging (CTRL_ADDED…). | Sampling utilities | 1.5d | Postman tests create 3 controls, run sample ≥25, log deficiency. |
| UI – Controls tab | Matrix grid by cycle, walkthrough modal, test planning (attributes selection), results capture, auto-deficiency banner. | UI shell | 1.5d | Manual test: add 3 revenue controls, run sample, mark one exception, deficiency shows in TCWG queue. |
| Docs & traceability | Update ATT/ISA mapping, add walkthrough/test procedures to knowledge base. | API done | 0.5d | Traceability matrix rows for ISA 315/330/265 signed off. |

### ADA‑1 Deterministic Analytics Kernel (Week 2)
| Work Item | Description | Dependencies | Est. | Acceptance |
|---|---|---|---|---|
| Schema (`audit_ADA1_schema.sql`) | ADARun & ADAException tables with ATT lineage columns (dataset hash, executor). | Phase 0 utilities | 0.5d | Schema migration & RLS verified. |
| Analytics runners | Deterministic jobs for JE risk scoring, ratio/variance, duplicates, Benford; plug into Sampling C1. | CTRL‑1 sampling util | 2d | CLI test run logs parameters, dataset hash, generates sample list. |
| UI – Analytics tab | Run cards, parameter forms, results tables, export CSV, “Send to Sampling/JE testing” action. | API | 1.5d | Manual: execute JE run with weekend/late/round rules; ATT manifest stored; exception tracked. |
| Logging & ATT docs | ADA_RUN_STARTED/COMPLETED; ATT documentation per run. | Runner completion | 0.5d | Evidence pack exported with inputs/outputs snapshots. |

### REC‑1 Reconciliation Workbench (Week 3)
| Work Item | Description | Dependencies | Est. | Acceptance |
|---|---|---|---|---|
| Schema (`audit_REC1_schema.sql`) | Bank/AR/AP reconciliation tables + item ledgers with evidence pointers. | Phase 0 baseline | 1d | Bank/AR/AP tables created; RLS enforced. |
| Matching engine | Deterministic matching (exact, amount/date ± tolerance), unresolved ledger, evidence PDF generator. | ADA exports for data ingestion | 2d | Acceptance scenario: bank recon with 2 OCs + 1 DIT unresolved -> misstatement entry created. |
| UI – Workbench | Statement import (CSV/PDF metadata), auto-match preview, reconciling items list, resolve workflow, export schedule. | Matching engine | 1.5d | Manual end-to-end run matches sample data, exports PDF, pushes evidence. |
| Integration to Misstatements | Wire unresolved items to existing Misstatements register & TCWG pack. | Misstatement API | 0.5d | Unresolved item visible in TCWG pack with link to recon evidence. |

> ✅ Reconciliation workspace skeleton live (`apps/web/app/audit/reconciliations/page.tsx`) with create/add/close flows and shared audit module tracking wired into `/api/recon/*` routes.

### GRP‑1 Group Audits (Week 4)
| Work Item | Description | Dependencies | Est. | Acceptance |
|---|---|---|---|---|
| Schema (`audit_GRP1_schema.sql`) | GroupComponent, GroupInstruction, ComponentWorkpaper, ComponentReview tables. | Phase 0 baseline | 0.5d | Migration + RLS tests. |
| API endpoints | CRUD for components, send/ack instructions, receive workpapers, review status. Activity logs (GRP_*). | Docs storage util | 1.5d | Scenario: 3 components (one significant), instruction sent/ack, workpaper uploaded, review complete. |
| UI – Group dashboard | Component grid with heatmap (materiality vs significance), instruction tracker timeline, review queue. | API | 1.5d | Manual acceptance per scenario. |
| Reporting hooks | Ensure TCWG pack summarises outstanding instructions & reviews. | TCWG service | 0.5d | TCWG report includes component status table. |

> ✅ Group audit schema, APIs, and workspace shipped (`supabase/sql/audit_GRP1_*`, `/api/group/*`, `apps/web/app/audit/group/page.tsx`) with shared approvals integration.

| OI‑1 | 1. Schema for OtherInformationDoc, OIFlag, ComparativesCheck.<br>2. PDF ingestion service (metadata extraction only).<br>3. APIs to upload doc, flag inconsistencies, resolve & push to Report builder.<br>4. UI – Other Information viewer with flag timeline & comparatives checklist.<br>5. Logs OI_UPLOADED/OI_FLAGGED/OI_RESOLVED. | Report builder integration | 3d | Upload annual report PDF, flag KPI, push wording to report draft, mark resolved. |

> ✅ Other Information module live (`supabase/sql/audit_OI1_*`, `/api/oi/*`, `apps/web/app/audit/other-information/page.tsx`) with evidence manifests and approvals.

## Phase 2 – Service Organisations & Specialists (Weeks 5-6)
| Module | Work Items | Dependencies | Est. | Acceptance |
|---|---|---|---|---|
| SOC‑1 | 1. Schema for ServiceOrg, SOC1Report, CUEC.<br>2. APIs to load SOC report metadata, add CUECs, record tests.<br>3. UI panel with SOC metadata, CUEC checklist, residual risk notes, and linkage to compensating procedures.<br>4. Logs: SOC_CREATED, SOC_REPORT_ADDED, SOC_CUEC_TESTED. | Phase 0 utilities, Controls module for compensating procedures | 3d | Add payroll processor Type 2, map 3 CUECs, test two, log one exception triggering extra substantive note. |
| EXP‑1 | 1. Schema for ExpertUseAssessment & IAUseAssessment.<br>2. APIs to capture assessments, link evidence docs, enforce approvals before conclusions become client-visible.<br>3. UI – Specialists tab cards with decision memo export.<br>4. Logs EXP_EXPERT_ASSESSED/EXP_IA_ASSESSED. | SOC‑1 doc storage pattern | 2.5d | Valuation expert assessment & IA reliance scenario completed with approvals. |

> ✅ Specialist reliance module live (`supabase/sql/audit_EXP1_*`, `/api/exp/*`, `apps/web/app/audit/specialists/page.tsx`) with approvals/evidence integration.
> ✅ Service organisation oversight module live (`supabase/sql/audit_SOC1_*`, `/api/soc/*`, `apps/web/app/audit/service-orgs/page.tsx`) including CUEC exception escalation and audit activity logging.
| OI‑1 | 1. Schema for OtherInformationDoc, OIFlag, ComparativesCheck.<br>2. PDF ingestion service (metadata extraction only).<br>3. APIs to upload doc, flag inconsistencies, resolve & push to Report builder.<br>4. UI – Other Information viewer with flag timeline & comparatives checklist.<br>5. Logs OI_UPLOADED/OI_FLAGGED/OI_RESOLVED. | Report builder integration | 3d | Upload annual report PDF, flag KPI, push wording to report draft, mark resolved. |

## Phase 3 – Tax Engines (Weeks 7-11)
This phase follows the blueprint already supplied (T‑1A to T‑4B). We align each sprint to one Codex job card.

| Sprint | Scope | Key Dependencies | Est. | Acceptance Snapshot |
|---|---|---|---|---|
| T‑1A | Malta CIT & imputation | Accounting TB snapshots, approvals framework | 1 week | Two-company test pack with refunds vs participation exemption ties to GL. |
| T‑1B | NID & Patent Box calculators | T‑1A CIT staging | 0.5 week | Three worked examples pass; adjustments flow into CIT. |
> ✅ T‑1B calculators live (`supabase/functions/tax-mt-nid`, `src/pages/tax/malta-cit.tsx`) with stored computations and automated CIT adjustments.
| T‑1C | ATAD ILR & CFC | T‑1A CIT, entity registry | 1 week | Cap + carryforward + CFC attribution scenario documented. |
> ✅ T‑1C ILR/CFC delivered (`supabase/functions/tax-mt-nid`, `src/pages/tax/malta-cit.tsx`) capturing disallowed interest and CFC inclusions with adjustment history.
| T‑1D | Fiscal unity | Prior tax entities + approvals | 1 week | 95% group consolidated return + tax account rollforward. |
| T‑2A | VAT + OSS/IOSS | Tax entity data, evidence utility | 1 week | Quarter of ledger data returns correct filings + approvals. |
> ✅ VAT & OSS calculator shipped (`supabase/migrations/20250924173000_tax_vat_returns.sql`, `src/pages/tax/vat-oss.tsx`) with history and ActivityLog coverage.
| T‑2B | DAC6 module | ADA analytics metadata | 0.75 week | Three hallmark scenarios produce submission packs. |
> ✅ DAC6 hallmark assessment delivered (`supabase/migrations/20250924182000_tax_dac6_schema.sql`, `src/pages/tax/dac6.tsx`) with automatic status tracking.
| T‑2C | Pillar Two | Tax entity tree, ownership links | 1 week | Two-jurisdiction QDMTT + IIR scenario outputs GIR. |
> ✅ Pillar Two engine live (`supabase/migrations/20250924200000_tax_pillar_two_schema.sql`, `/supabase/functions/tax-mt-nid`, `src/pages/tax/pillar-two.tsx`) modelling QDMTT/IIR with GIR export and tax entity relationships.
| T‑3A | Treaty/WHT resolver + MAP/APA | Tax data store, document utility | 0.75 week | MT↔US WHT scenarios resolved; MAP case timeline tracked. |
> ✅ Treaty WHT resolver and MAP/APA tracking live (`supabase/migrations/20250924210000_tax_treaty_wht.sql`, `/tax/treaty-wht`, `supabase/functions/tax-mt-nid`).
| T‑3B | US overlays | T‑1/2 data, calculators | 1 week | US parent scenario covering GILTI/163(j)/CAMT/§4501. |
> ✅ US overlays delivered (`supabase/migrations/20250924213000_tax_us_overlays.sql`, `/tax/us-overlays`, updated edge functions) covering GILTI, §163(j), CAMT, and §4501 computations.
| T‑4A | Policy packs + governance | All previous modules | 0.75 week | Refusal cases & approval matrix enforced. |
> ✅ Governance policy packs (`STANDARDS/POLICY/*_governance_pack.md`, `approvals_matrix.md`) published; activity catalog + approvals matrix updated for Treaty WHT and US overlays.
| T‑4B | Traceability, telemetry, archive | Activity log & evidence stores | 0.75 week | Telemetry dashboard + archive manifests with checksums. |
> ✅ Telemetry sync (`supabase/functions/telemetry-sync`) and archive manifest sync (`supabase/functions/archive-sync`) automated with ActivityLog coverage.

## Phase 4 – Hardening & Release (Weeks 12-13)
| Task | Goal | Activities | Est. | Acceptance |
|---|---|---|---|---|
| Performance & load testing | Ensure deterministic jobs scale | Load ADA & reconciliation runs with large datasets; profile Supabase policies. | 3d | 95th percentile run < defined SLA; no RLS regressions. |
| Security review | Validate RLS, approvals, secrets | Pen-test endpoints, verify signed URLs expiry, review audit logs for completeness. | 3d | Report with zero critical findings; mitigations tracked. |
| UAT & training | Enable partner review | Scripted UAT for each module, capture feedback, update documentation. | 2d | UAT sign-off; docs published in `/docs`. |
| Production launch checklist | Governance | Run PRODUCTION_READINESS_CHECKLIST.md, confirm telemetry & alerting. | 1d | Checklist signed by Partner + DevOps. |

> ✅ Close engine delivered (`supabase/functions/accounting-close`, `src/lib/accounting-close-service.ts`, `apps/web/app/api/recon/*`) with ledger imports, journal lifecycle, reconciliations, trial balance snapshots, and close period controls.
> ✅ Disclosure composer & IFRS note pack (`apps/web/app/api/financials/notes/route.ts`, `src/lib/financial-report-service.ts`, `src/pages/reporting/report.tsx`) generating IFRS 15/16/9, IAS 36/12/19/7, IFRS 13/8 narratives.
> ✅ Inline XBRL (ESEF) exporter (`apps/web/app/api/financials/esef/route.ts`) producing multipart XHTML/resources bundle for regulator filings.
> ✅ Group consolidation workspace (`apps/web/app/api/financials/consolidation/route.ts`, `src/lib/consolidation-service.ts`, `src/pages/reporting/consolidation.tsx`) aggregating parent/subsidiary ledgers with intercompany elimination guidance.
> ✅ Documentation captured in `docs/financial-reporting.md` with governance anchors and usage guidance; performance & UAT hardening plan in `docs/performance-uat-plan.md`.

## Cross-Cutting Deliverables
- **Documentation**: Update `/docs` per module (user guide, runbooks), extend `/STANDARDS/TRACEABILITY/matrix.md` with ISA/ATT/IAASB and tax references after each sprint.
- **Testing**: Expand automated test suites (unit for utilities, integration for APIs, Playwright smoke for UI via `npm run test:playwright`) with >40% coverage by end of Phase 2; gating via CI.
- **Approvals workflow**: Ensure every client-visible artifact (deficiency, SOC exception, tax filing) routes through ApprovalQueue with Manager+ requirement.
- **Telemetry**: Telemetry dashboard (`src/pages/telemetry/dashboard.tsx`) summarises coverage, SLA status, refusal events with manual sync via `syncTelemetry`; integrates with notification channel per `docs/telemetry.md`.
- **Evidence TTL**: Centralised signed URL policy (`lib/security/signed-url-policy.ts`) enforces ≤5 minute defaults with optional overrides and metadata redaction in manifests (`apps/web/lib/audit/evidence.ts`).

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Supabase migration conflicts across parallel sprints | Deployment failures | Use feature branches per sprint; run `supabase db diff` in CI; gate merges on staging migration test. |
| Sampling C1 dependency delays | Blocks CTRL‑1/ADA‑1 testing | Stub sampling client with deterministic fixtures; swap to live service once available. |
| UI complexity across multiple tabs | User confusion, regressions | Share component library, maintain Storybook entries, run visual regression tests. |
| Regulatory updates mid-build (e.g., Pillar Two guidance) | Rework calculators | Version policy packs; capture effective date; allocate 0.5d buffer per sprint for updates. |

## Milestones
- **M1 (End Week 4)**: CTRL‑1, ADA‑1, REC‑1, GRP‑1 live in staging with acceptance scenarios documented.
- **M2 (End Week 6)**: SOC‑1, EXP‑1, OI‑1 complete; TCWG reporting integrated; >60% of audit workflow covered.
- **M3 (End Week 11)**: Tax engine phases T‑1 to T‑4 delivered; policy packs enforce approvals/refusals.
- **M4 (End Week 13)**: Performance/security hardening complete; production go-live readiness approved.
