# Standards Traceability Matrix

| Trace ID | Standard / Framework | Control / Requirement | Implementation | Evidence |
| --- | --- | --- | --- | --- |
| TM-001 | ISQM 1 §25-32 | Establish quality objectives for assurance engagements. | Governance policy packs in `STANDARDS/POLICY` with approval routing via `approval_queue`. | Policy acknowledgement events in `activity_log` and governance acceptance tests. |
| TM-002 | ISQM 1 §32-33 | Enforce segregation of duties across organizations. | Supabase IAM schema (`supabase/sql/iam_IAM1_schema.sql`) with RLS and `/api/iam/*` endpoints. | IAM integration tests and audit trail entries in `activity_log`. |
| TM-003 | ISQM 1 §33-35 | Require step-up MFA for privileged workflows. | WhatsApp OTP edge functions `whatsapp_otp_send` / `whatsapp_otp_verify`. | OTP verification records and Playwright MFA coverage. |
| TM-004 | ISQM 1 §48-52 | Monitor service-level breaches and refusals. | Telemetry aggregations in `services/rag/index.ts` + Grafana dashboards. | `telemetry_service_levels` snapshots with automated alerts. |
| TM-005 | ISA 220 (Revised) §24-30 | Capture partner approval prior to plan release. | Approval queue `AUDIT_PLAN_FREEZE` handled in `apps/web/app/api/approvals`. | Approval decision payloads and Vitest plan approval tests. |
| TM-006 | ISA 220 (Revised) §13-39 | Maintain evidence of engagement leadership. | `audit_module_records` and `audit_record_approvals` tables. | Activity log entries `PLAN_SUBMITTED`/`PLAN_APPROVED` and archive manifests. |
| TM-007 | ISA 230 §8-11 | Preserve immutable audit documentation. | Archive sync function `/functions/v1/archive-sync`. | Manifest hash stored in `engagement_archives` plus regression test exports. |
| TM-008 | ISA 240 §15-32 | Document fraud planning and journal entry strategy. | `public.fraud_plans` + JE strategy schema with UI planner. | Fraud plan approvals logged and fixtures under `tests/audit/test_fraud_plan.py`. |
| TM-009 | ISA 260 §15-17 | Track communications with TCWG. | Communications stored in `public.tcw_communications` with `/api/audit/tcwg/*`. | Meeting minutes uploaded as evidence with ActivityLog `TCWG_COMM_RECORDED`. |
| TM-010 | ISA 265 §7-11 | Escalate control deficiencies with severity. | `public.deficiencies` schema and notifications via `/api/controls/deficiency`. | Deficiency lifecycle tests and audit trail `CTRL_DEFICIENCY_RAISED`. |
| TM-011 | ISA 300 §7-12 | Version engagement strategy before fieldwork. | Audit plan workspace `apps/web/app/audit/planning/page.tsx`. | Plan history timeline and unit tests for plan publish flow. |
| TM-012 | ISA 315 (Revised) §19-32 | Register risks linked to analytics. | `public.audit_risks` and `public.audit_risk_signals` migrations. | Risk linkage validations and analytics snapshots stored in Supabase. |
| TM-013 | ISA 315 (Revised) §26-29 | Maintain controls register tied to engagements. | Controls API `/api/controls/*` and UI `src/pages/audit/workspace/controls.tsx`. | Controls acceptance tests and ActivityLog `CTRL_ADDED`. |
| TM-014 | ISA 320 §10-14 | Capture materiality thresholds with rationale. | Materiality form under `apps/web/app/audit/materiality/page.tsx`. | Stored thresholds with ActivityLog `MATERIALITY_SET`. |
| TM-015 | ISA 330 §7-29 | Link risks to responses and substantive tests. | `public.audit_responses` schema with planner UI integrations. | Response completeness checks and test fixtures verifying risk links. |
| TM-016 | ISA 402 §9-21 | Evaluate service organization controls. | SOC workspace `apps/web/app/audit/service-orgs/page.tsx`. | SOC review approvals and evidence manifests referencing SOC reports. |
| TM-017 | ISA 500 §6-9 | Maintain evidence lineage for balances. | Evidence manifest utilities in `apps/web/lib/audit/evidence.ts`. | Archive exports include dataset hashes captured in tests. |
| TM-018 | ISA 520 §5-7 | Document analytic procedures parameters. | Analytics runner `server/analytics_runner.py` and `/api/ada/*`. | ADA run logs with parameter JSON persisted in Supabase. |
| TM-019 | ISA 530 §6-9 | Apply sampling methodology for tests of controls. | Sampling client integrated in controls UI with minimum sample size enforcement. | Sample selection stored in `control_tests` with QA tests covering thresholds. |
| TM-020 | ISA 540 (Revised) §17-31 | Evaluate accounting estimates with risk factors. | Estimate review templates in `apps/web/app/audit/estimates/page.tsx`. | Review memo exports and approvals stored in `estimate_reviews`. |
| TM-021 | ISA 600 (Revised) §19-49 | Manage group engagement components. | Group oversight schema `/api/group/*` and component workspace. | Component auditor oversight tracked in ActivityLog `GRP_COMPONENT_UPDATED`. |
| TM-022 | ISA 610 §15-24 | Assess internal audit reliance. | `public.internal_audit_assessments` table with UI review. | Assessment approvals captured with EQR sign-off. |
| TM-023 | ISA 620 §9-21 | Govern use of specialists. | Specialists workspace referencing `public.specialist_requests`. | Engagement file stores specialist credentials and review outcomes. |
| TM-024 | ISA 700 §10-41 | Enforce report approval workflow. | Audit report builder `/api/audit/report/*` with approval queue `AUDIT_REPORT_RELEASE`. | Final report PDF plus ActivityLog `REPORT_RELEASED`. |
| TM-025 | ISA 705 §7-12 | Document modifications to opinion. | Opinion module with change reasons stored in `opinion_changes`. | Modified opinion approvals and evidentiary attachments. |
| TM-026 | ISA 706 §6-11 | Track emphasis-of-matter and other paragraphs. | Report builder UI section storing paragraph metadata. | Paragraph history table `report_highlights` with reviewer sign-off. |
| TM-027 | ISA 720 (Revised) §12-24 | Resolve other information inconsistencies. | Other information workspace `apps/web/app/audit/other-information/page.tsx`. | OI manifest statuses and reviewer approvals. |
| TM-028 | IESBA Code §400 | Safeguard independence for audit clients. | NAS selection guardrails in `src/pages/engagements.tsx`. | NAS review summary saved with override notes. |
| TM-029 | IESBA Code §601 | Evaluate long association threats. | Rotation scheduler `apps/web/app/audit/independence/page.tsx`. | Tenure dashboard exports and rotation approval records. |
| TM-030 | IESBA Code §604 | Manage fees and compensation conflicts. | Billing policy enforcement via `public.engagement_fee_alerts`. | Alerts logged and reviewed through finance approvals. |
| TM-031 | GDPR Art. 30 | Maintain processing activity records. | `context_json.evidenceRefs` fields in agent actions. | Supabase row history and privacy assessments. |
| TM-032 | GDPR Art. 32 | Protect personal data in storage and transit. | S3 signed URL policy `lib/security/signed-url-policy.ts`. | Automated tests verifying TTL and encryption flags. |
| TM-033 | OECD Pillar Two | Calculate top-up tax obligations. | Pillar Two calculator `/api/p2/compute` and schema `eu_pillar_two_monitoring`. | Calculator tests `tests/tax/test_calculators.py::test_pillar_two_top_up`. |
| TM-034 | EU ATAD ILR | Enforce interest limitation rules. | `mt_atad_ilr_evaluations` schema and decision engine. | Unit tests verifying refusal gates and approvals. |
| TM-035 | EU DAC6 | Capture reportable arrangements. | `/api/dac6/scan` ingestion and `eu_dac6_assessments` table. | DAC6 flagging tests with reviewer workflow evidence. |
| TM-036 | EU VAT Directive | Manage VAT/OSS filings. | VAT preparation endpoint `/api/vat/period/prepare`. | VAT workflow tests and reconciliation exports. |
| TM-037 | Malta CIT | Automate CIT calculation with approvals. | `mt_cit_calculations` table and `/api/tax/mt/cit/compute`. | ActivityLog `MT_CIT_APPROVAL_SUBMITTED` + CIT calculator tests. |
| TM-038 | Malta NID | Track notional interest deductions. | `mt_nid_positions` schema with client computation. | NID cap validation tests and override approvals. |
| TM-039 | Malta Fiscal Unity | Review pooling benefits. | `mt_fiscal_unity_reviews` workflow. | Review decision logs and refusal reason storage. |
| TM-040 | US IRC §951A | Compute GILTI exposure. | `us_overlay_gilti_runs` and `/api/us/gilti/compute`. | GILTI calculator regression tests. |
| TM-041 | US IRC §163(j) | Apply interest deduction limits. | `us_overlay_163j_runs` service within tax overlay module. | Test coverage ensuring EBITDA threshold handling. |
| TM-042 | US IRC §59(k) | Manage CAMT computations. | CAMT module in `tax/camt` service with Supabase table `us_overlay_camt_runs`. | Scenario-based tests verifying exemptions. |
| TM-043 | US IRC §4501 | Track stock repurchase excise tax. | `/api/us/stock-buyback/compute` pipeline with `us_overlay_4501_runs`. | Evidence includes calculation worksheets stored in Supabase. |
| TM-044 | IFRS 15 | Recognize revenue performance obligations. | Revenue module `apps/web/app/finance/revenue/page.tsx`. | Revenue recognition testing dataset and approvals. |
| TM-045 | IFRS 16 | Manage lease accounting schedules. | Lease engine `apps/web/app/finance/leases/page.tsx` with amortization calculations. | Lease register exports and reconciliations. |
| TM-046 | IFRS 9 | Monitor expected credit losses. | ECL analytics pipeline `analytics/ecl` with Supabase storage. | Analytics run logs and review sign-off. |
| TM-047 | IFRS 13 | Maintain fair value hierarchy disclosures. | Fair value register `apps/web/app/finance/fair-value/page.tsx`. | Disclosure templates with reviewer approvals. |
| TM-048 | IAS 1 | Align chart of accounts to presentation lines. | Ledger schema `ledger_accounts` and FS mapping UI. | TB snapshots with ActivityLog `FS_MAPPING_APPLIED`. |
| TM-049 | IAS 7 | Reconcile cash balances prior to statement preparation. | Reconciliation API `/api/recon/*` and UI workspace. | Closed reconciliation evidence and approval metadata. |
| TM-050 | IAS 8 | Control journal entry adjustments. | Journal API workflow with batch approvals. | ActivityLog `JE_POSTED` plus audit assertions. |
| TM-051 | IAS 10 | Monitor subsequent events. | Subsequent events module `apps/web/app/audit/subsequent-events/page.tsx`. | Event logs and approval queue `SUBSEQUENT_EVENT`. |
| TM-052 | IAS 21 | Handle foreign currency remeasurement. | FX remeasure endpoint `/api/fx/remeasure`. | FX preview logs and reviewer sign-off. |
| TM-053 | IAS 24 | Track related party disclosures. | Related party register `apps/web/app/finance/related-parties/page.tsx`. | Disclosure confirmations stored with attachments. |
| TM-054 | IAS 36 | Record impairment assessments. | Impairment module capturing cash-generating unit testing. | Assessment memos linked through evidence manifests. |
| TM-055 | IAS 37 | Manage provisions and contingencies. | Provision tracker `apps/web/app/finance/provisions/page.tsx`. | Provision approval workflows with supporting documents. |
| TM-056 | COSO Principle 10 | Design control activities with technology. | Controls workspace integrates automated tests via `analytics_runner`. | Control automation logs and review checklists. |
| TM-057 | COSO Principle 16 | Conduct ongoing evaluations. | Monitoring dashboard `apps/web/app/analytics/monitoring/page.tsx`. | SLA breach alerts and remediation tickets. |
| TM-058 | NIST SP 800-53 AU-6 | Review audit logs for anomalies. | Log review job in `services/rag/index.ts` streaming to telemetry. | Log review attestations stored in `audit_log_reviews`. |
| TM-059 | ISO 27001 A.12.7 | Preserve integrity of application software. | Release gate `/api/release-controls/check` with telemetry gating. | Release control snapshots and k6 performance artefacts. |

# Tax Module Traceability Matrix

The matrix aligns statutory requirements with the new database schemas, API routes, UI workspaces, and automated tests.

| Requirement | Supabase Schema | API Route | UI Workspace | Test Coverage | Notes |
| --- | --- | --- | --- | --- | --- |
| Malta CIT (ISA 315, MT CIT Act) | `mt_cit_calculations` | `/api/tax/mt/cit/compute` | Malta core – CIT | `tests/tax/test_calculators.py::test_malta_cit_decisions` | Review threshold 500k triggers Head of Tax approval. |
| Malta NID / Participation Benefit | `mt_nid_positions` | Client computation | Malta core – Participation/NID | `tests/tax/test_calculators.py::test_malta_nid_cap` | Enforces statutory cap and utilisation metric. |
| ATAD ILR (EU ATAD) | `mt_atad_ilr_evaluations` | Client computation | Malta core – ATAD ILR | `tests/tax/test_calculators.py::test_atad_ilr_refusal_gate` | Refusal when disallowed interest > 20% EBITDA. |
| Fiscal Unity (MT regulations) | `mt_fiscal_unity_reviews` | Client computation | Malta core – Fiscal unity | `tests/tax/test_calculators.py::test_fiscal_unity_review` | Review when pooling benefit claimed, refusal on loss. |
| VAT/OSS/IOSS (EU VAT directive) | `eu_vat_periods` | `/api/vat/period/prepare` | EU overlays – VAT | `tests/tax/test_vat_workflow.py::test_vat_review_flags` | Review on refunds and non-domestic schemes. |
| DAC6 (EU DAC6) | `eu_dac6_assessments` | `/api/dac6/scan` | EU overlays – DAC6 scanner | `tests/tax/test_calculators.py::test_dac6_flagging` | Refusal when >2 arrangements flagged. |
| Pillar Two (OECD GloBE) | `eu_pillar_two_monitoring` | `/api/p2/compute` | EU overlays – Pillar Two | `tests/tax/test_calculators.py::test_pillar_two_top_up` | Refusal when aggregate top-up ≥ 500k. |
| Treaty Resolver / MAP / APA | `intl_treaty_resolver_runs` | `/api/treaty/resolve` | International – Treaty resolver | `tests/tax/test_calculators.py::test_treaty_workflow` | Review when MAP unavailable or APA requested. |
| US GILTI (IRC §951A) | `us_overlay_gilti_runs` | `/api/us/gilti/compute` | International – US overlays | `tests/tax/test_calculators.py::test_us_gilti_thresholds` | Refusal when no GILTI base, review above 250k tax. |
| Autonomy Telemetry & Policy Packs | `autonomy_telemetry_events`, `autonomy_policy_packs` | Activity logging within all routes | Evidence export banner | `tests/tax/test_telemetry_payloads` | Ensures activity snapshots include decision + metrics. |


# Traceability Matrix — Accounting Close Foundation (A-1)

## Governance & Approvals Backbone
| Standard / Regulation | Clause reference | Control / Requirement | Implementation (code or schema) | Evidence captured |
| --- | --- | --- | --- | --- |
| ISQM 1 | 25-32 | Maintain documented quality objectives and monitoring across audit, tax, accounting. | Governance policy packs `STANDARDS/POLICY/audit_governance_pack.md`, `tax_governance_pack.md`, `accounting_governance_pack.md`; approvals overview `STANDARDS/POLICY/approvals_matrix.md`. | Policy acknowledgement workflow; `activity_log` with `module` + `policy_pack`. |
| ISQM 1 | 32-33 | Enforce access control & segregation of duties across organizations and teams. | IAM schema & RLS (`supabase/sql/iam_IAM1_schema.sql`, `supabase/sql/iam_IAM1_rls.sql`), permission matrix (`POLICY/permissions.json`), IAM endpoints (`/api/iam/*`), Admin UI (`src/pages/admin/users.tsx`, `src/pages/admin/teams.tsx`), role guidance `POLICY/roles.md`. | `activity_log` events (`ORG_CREATED`, `INVITE_*`, `MEMBERSHIP_ROLE_CHANGED`, `TEAM_*`); acceptance tests for invite/demotion. |
| ISQM 1 | 33, 37 | Validate autonomy toggles, MFA, and telemetry before release. | `/api/release-controls/check` aggregates autonomy readiness, recent MFA, open telemetry alerts; policy suite covers `jobs`, `job_schedules`, MFA RLS. | Release control JSON snapshot; `tests/test_release_controls.py`; k6 artefacts under `GO-LIVE/artifacts/`. |
| ISQM 1 | 33, 35 | Identity proofing for privileged actions (step-up MFA). | WhatsApp MFA schema & RLS, edge functions `whatsapp_otp_send` / `whatsapp_otp_verify`, guard `require_recent_whatsapp_mfa`, close lock enforcement. | `activity_log` (`MFA_OTP_SENT`, `MFA_OTP_VERIFIED`, `WHATSAPP_LINKED`); UI prompts. |
| ISA 230 | 8-11 | Preserve audit documentation completeness with hashed manifests. | Archive sync `/functions/v1/archive-sync`, `engagement_archives` manifest updates. | Archive manifest checksum + module summary in `engagement_archives`. |
| ISA 220 (Revised) | 13-39 | Partner/EQR leadership over audit engagements. | Approval queue kinds `AUDIT_PLAN_FREEZE`, `AUDIT_REPORT_RELEASE`; event catalog `PLAN_*` with pack `AP-GOV-1`. | ActivityLog, approval_queue, immutable archive manifest on plan lock. |
| ISA 220 (Revised) | 21-33 | Track preparer/manager/partner stages for modules. | Shared tables `audit_module_records`, `audit_record_approvals` + RLS. | Central register rows + approval decisions per stage. |
| ISA 600 (Revised) | 19-49 | Manage group components and oversight of component auditors. | GRP-1 schema/API (`/api/group/*`), workspace `apps/web/app/audit/group/page.tsx`. | `activity_log` (`GRP_*`), manifests with workpaper links & review status. |
| IESBA Code §600 | 600.19-600.27 | Monitor prohibited NAS overrides and safeguard approvals. | Independence monitor (`src/pages/independence.tsx`), engagements API `/v1/engagements` independence gating, Supabase columns `independence_checked`, `independence_conclusion`. | ActivityLog `ENGAGEMENT_UPDATED`, approval queue overrides with hashed payloads, monitor dashboard snapshots. |
| ISA 402 | 9-21 | Evaluate service organisations and SOC reports. | SOC-1 schema/API (`/api/soc/*`), workspace `apps/web/app/audit/service-orgs/page.tsx`. | `activity_log` (`SOC_*`), CUEC tests and escalations. |
| ISA 620 & ISA 610 | 9-21 / 15-24 | Specialists/internal audit competence/objectivity & reliance. | EXP-1 schema/API (`/api/exp/*`), specialists workspace. | Evidence manifests; `activity_log` (`EXP_*`); approval queue for conclusions. |
| ISA 720 (Revised) | 12-24 | Resolve other information inconsistencies pre-report. | OI-1 schema/API (`/api/oi/*`), workspace `apps/web/app/audit/other-information/page.tsx`. | OI manifest + flag history; manager approvals. |
| IESBA Code §600 | 600.5-600.22 | Guard independence when supplying tax/accounting support to audit clients. | Policy packs `T-GOV-1`, `A-GOV-1`; telemetry exception table (Phase 5). | ActivityLog severity; independence incidents in telemetry (Phase 5). |
| Malta ITA governance | CFR Circ. 05/2023–06/2023 | Technical reviewer checkpoints on high-risk refund & ATAD matters. | Approval matrix row (T-GOV-1) auto-routes via `approval_queue` (`TAX_POLICY_APPROVAL`). | `activity_log` `MT_CIT_APPROVAL_SUBMITTED`, `MT_CIT_APPROVED`. |
| OECD Pillar Two & EU Min Tax | Art. 6-10 | QDMTT/IIR calculations with GIR-ready evidence. | Pillar Two schema + edge fn + UI page. | `activity_log` `PILLAR_TWO_COMPUTED`; `pillar_two_computations` history. |
| OECD MTC & MAP Manual | Art. 23, 25 | Treaty relief determinations and MAP/APA logs. | Treaty WHT schema & calculators; treaty UI. | `activity_log` `TREATY_WHT_COMPUTED`; `tax_dispute_cases/events`. |
| IRC §§951A, 163(j), 55, 4501 | Various | US overlays (GILTI, 163(j), CAMT, 4501). | US overlay schema & calculators; US overlays UI. | `activity_log` `US_GILTI_COMPUTED`, `US_163J_COMPUTED`, `US_CAMT_COMPUTED`, `US_4501_COMPUTED`. |
| ISQM 1 Monitoring | 48-52 | Capture SLA, coverage, and refusal telemetry. | `telemetry_service_levels`, `telemetry_coverage_metrics`, `telemetry_refusal_events`; docs in `docs/telemetry.md`. | Dashboards join telemetry with ActivityLog; breaches via `status`. |

## Financial Reporting & Close Controls
| Standard / Regulation | Clause reference | Control / Requirement | Implementation (code or schema) | Evidence captured |
| --- | --- | --- | --- | --- |
| IAS 1 | 15-25, 54-60 | Maintain ledger & chart of accounts aligned to presentation lines. | `ledger_accounts`, `coa_map`, draft FS endpoint (`apps/web/app/api/financials/draft/route.ts`). | TB snapshots; FS mapping ActivityLog (`FS_MAPPING_APPLIED`). |
| IAS 1 | 134-138 | Material variances vs prior/budget with explanations. | `variance_rules`, `variance_results`, variance run API (`apps/web/app/api/variance/run/route.ts`). | ActivityLog (`VARIANCE_RUN`), variance rows with status/explanations. |
| IAS 7 | 18-20, 43 | Cash balances & reconciling items pre–cash flow statement. | `reconciliations` (type=BANK), reconciliation API (`apps/web/app/api/recon/*`), workbench UI (`apps/web/app/audit/reconciliations/page.tsx`). | Schedules; ActivityLog (`RECON_CLOSED`); module manifest. |
| IAS 7 | 30-31 | Working capital reconciliations feeding indirect cash flow. | Reconciliation schema + close lock validation (`apps/web/app/api/close/lock/route.ts`). | Closed reconciliations with zero difference before lock. |
| IAS 21 | 9-23 | FX balances & remeasurement suggestions. | FX remeasure endpoint (`apps/web/app/api/fx/remeasure/route.ts`). | ActivityLog (`FX_REMEASURE_PREVIEW`). |
| IAS 8 / IAS 10 | 5, 41 | Journal adjustments via controlled batches. | `journal_batches`, `ledger_entries`, journal API workflow. | ActivityLog (`JE_BATCH_CREATED`,`JE_SUBMITTED`,`JE_APPROVED`,`JE_POSTED`). |
| EU Accounting Dir. 2013/34/EU | Art. 4-6 | Reliable records & periodic closings. | Close lifecycle schema (`close_period(s)`, `close_pbc_items`) and APIs. | ActivityLog (`CLOSE_ADVANCED`,`CLOSE_LOCKED`), approvals. |
| EU Accounting Dir. 2013/34/EU | Art. 36-40 | Management responsibility for ICFR documentation. | PBC template (`CHECKLISTS/ACCOUNTING/close_pbc_template.yaml`), approvals. | PBC items with doc links & reviewer status. |
| Malta GAPSME | Regs. 18-27 | SME close discipline mirroring IFRS controls. | Same close workflow; FS basis flag on `fs_lines`. | Evidence same as IFRS; basis flagged. |
| ISA 330 (evidence) | 18-24 | Evidence for ICFR controls. | ActivityLog + doc mgmt; ATT manifest utility (`apps/web/lib/audit/evidence.ts`). | Exported schedules, TB snapshots, evidence manifest JSON. |
| ISA 500 | 6-9 | Complete audit trail for balances/transactions. | TB snapshot table; journaling controls; recon exports. | Snapshots with totals; cross-ref ledger entries. |
| Internal policy | Close governance | Responsibilities, controls, approvals documented. | `/STANDARDS/POLICY/close_governance.md`; approvals enforcement in APIs. | Policy acknowledgements + approvals in `approvals`. |
| ISA 300 | 7-12 | Version overall audit strategy pre-fieldwork. | `public.audit_plans` migration; strategy upsert API; planner UI. | ActivityLog `PLAN_CREATED`/`PLAN_STRATEGY_UPDATED`; change log. |
| ISA 320 | 10-14 | Materiality thresholds with rationale. | `public.materiality_sets`, endpoint + form. | ActivityLog `MATERIALITY_SET`; memo export. |
| ISA 220 (Revised) | 24-30 | Partner/EQR approval before plan release. | Approval queue (`AUDIT_PLAN_FREEZE`), handler function. | ActivityLog `PLAN_SUBMITTED`,`PLAN_APPROVED`,`PLAN_LOCKED`. |
| ISA 230 | 8-11 | Preserve tax return schedules & support docs. | `return_files` table; prepare-return endpoint; UI preview. | Return JSON snapshot + doc id; ActivityLog `MT_CIT_RETURN_READY`. |

## Risk, Controls, Analytics
| Standard / Regulation | Clause reference | Control / Requirement | Implementation (code or schema) | Evidence captured |
| --- | --- | --- | --- | --- |
| ISA 315 (Revised) | 19-32 | Document identified risks (categorisation, assertions, analytics linkage). | `public.audit_risks`, `public.audit_risk_signals`, `public.audit_risk_activity` (migration `20250924120000_audit_risk_register.sql`); types in `supabase/src/integrations/supabase/types.ts`. | ActivityLog with policy pack `AP-GOV-1`; risk activity rows and analytics snapshots. |
| ISA 315 (Revised) | 12-23, 26-29 | Maintain controls register tied to engagements. | `public.controls` schema (`supabase/sql/audit_CTRL1_schema.sql`), APIs (`apps/web/app/api/controls/*`), React workspace (`src/pages/audit/workspace/controls.tsx`). | ActivityLog (`CTRL_ADDED`, `CTRL_UPDATED`); timestamps on control rows. |
| ISA 330 | 18-26 | Walkthroughs & attribute testing (sample sizes ≥25). | Tables `control_walkthroughs`, `control_tests`; Sampling client; `/api/controls/test/run`; UI `src/pages/audit/workspace/controls.tsx`. | Stored walkthrough/tests; sampling plans; ActivityLog `CTRL_TEST_RUN` with sample size/exceptions. |
| ISA 330 | 7-29 | Link risks to responses, analytics, substantive procedures. | `public.audit_responses`, `public.audit_response_checks` (migration `20250924124000_audit_responses_matrix.sql`), edge function `audit-responses`, UI planner (TBD). | ActivityLog `RESPONSE_*`; completeness checks with reviewer & timestamp. |
| ISA 240 | 15-32, 47 | Fraud brainstorming, inherent risks, responses, JE strategy. | `public.fraud_plans`, `public.fraud_plan_actions`, `public.journal_entry_strategies` (migration `20250924130000_fraud_plan_je_strategy.sql`). | ActivityLog (`FRAUD_PLAN_*`), fraud approvals, JE filters stored. |
| ISA 265 | 7-11 | Deficiencies with severity & recommendations to TCWG. | `public.deficiencies`; created during test runs and via manual endpoint. | ActivityLog (`CTRL_DEFICIENCY_RAISED`); statuses and recommendations stored. |
| ITGC coverage | ISA 315.A128, ISA 330.A44 | Track access/change/operations ITGC groups. | `public.itgc_groups` schema; included in controls API; UI ITGC panel. | ITGC rows per engagement with scope/notes. |
| Firm policy | Audit controls governance | Methodology for register, walkthroughs, testing, deficiencies. | `/STANDARDS/POLICY/audit_controls_itgc.md`. | Policy references & alignments. |
| ISA 500 / ISA 520 | 6-12, 5-7 | Deterministic analytics with lineage, parameters, exceptions. | `public.ada_runs`, `public.ada_exceptions`; analytics runner (`server/analytics_runner.py`); APIs (`/api/ada/*`); workspace `src/pages/audit/workspace/analytics.tsx`. | ActivityLog (`ADA_RUN_STARTED`,`ADA_RUN_COMPLETED`,`ADA_EXCEPTION_ADDED`); dataset hash & parameters stored; exception dispositions recorded (`ADA_EXCEPTION_RESOLVED`). |

> Evidence references assume archive hooks (A-1 scope) capture document ids and ActivityLog entries upon completion.

## Agent HITL Governance (AGT-GOV-1)
| Standard / Regulation | Clause reference | Control / Requirement | Implementation (code or schema) | Evidence captured |
| --- | --- | --- | --- | --- |
| ISQM 1 | 32-33 | Require managerial review before issuing outputs that could impact client deliverables or financial reporting. | Sensitive tool gating via `tool_registry` and `agent_actions.status='BLOCKED'` when caller below `MANAGER`; approval queue rows `kind='AGENT_ACTION'`. | `tool_registry` records, `agent_actions` row, `approval_queue` entry with `requested_by_user_id`. |
| ISA 220 (Revised) | 26, 35 | Document partner/manager oversight of automated procedures and evidence. | `/v1/approvals` + `/v1/approvals/:id/decision` endpoints; `services/rag/index.ts` `resumeApprovedAction` + `rejectBlockedAction`; ActivityLog `AGENT_TOOL_CALL`. | `approval_queue` decision metadata (`approved_by_user_id`, `decision_at`), `agent_traces` with `resumedFromApproval`, ActivityLog payload hashes. |
| ISQM 1 | 48-52 | Monitor approval backlog, refusals, and telemetry for escalation. | Analytics endpoint aggregating `agent_sessions`, `agent_traces`, `approval_queue`; dashboard card “Agent HITL”. | `/analytics/agent` JSON snapshot, Grafana panel export, weekly backlog report. |
| GDPR Art. 30 (Records of processing) | n/a | Maintain evidence of human decisions in AI-assisted workflows. | `context_json.evidenceRefs` stores reviewer-supplied artefacts, `agent_actions.output_json` retains decision outcome. | Supabase row history, evidence attachments referenced in release ticket. |
| ISQM 1 Monitoring | 48-52 | Capture model-level diagnostics for quality management reviews. | `openai_debug_events` table persisted via Debugging Requests API; optional detailed payload fetch. | Debug dashboards referencing request IDs, Supabase exports for QA investigations. |
