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
