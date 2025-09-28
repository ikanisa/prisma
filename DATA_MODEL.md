# Data Model

## Table of Contents
- [Supabase Schema](#supabase-schema)
- [Google Sheets](#google-sheets)

## Supabase Schema
The following tables are defined in migrations:

| Table | Key Columns | Description |
|---|---|---|
| `users` | `id` (PK, FK auth.users) | Profile for each auth user |
| `organizations` | `id` (PK) | Tenant organizations |
| `memberships` | `id` (PK), (`org_id`,`user_id`) unique | Links users to organizations with role |
| `clients` | `id` (PK), `org_id` FK | Client records |
| `engagements` | `id` (PK), `org_id`, `client_id` FKs | Projects/engagements per client |
| `tasks` | `id` (PK), `org_id`, `engagement_id` FKs | Work items assigned to users |
| `documents` | `id` (PK), `org_id` FK | File metadata |
| `notifications` | `id` (PK), `user_id` FK | User notifications |
| `activity_log` | `id` (PK), `user_id` FK | Audit log of user actions |
| `estimate_register` | `id` (PK), `org_id`, `engagement_id` FKs | Register of accounting estimates with uncertainty levels |
| `going_concern_worksheets` | `id` (PK), `org_id`, `engagement_id` FKs | Going concern assessments and conclusions |
| `audit_module_records` | `id` (PK), `org_id`, `engagement_id` FKs | Shared status + metadata register for audit modules (prep/review/approval workflow) |
| `audit_record_approvals` | `id` (PK), `record_id` FK | Stage-by-stage approval snapshots for audit_module_records |
| `audit_planned_procedures` | `id` (PK), `org_id`, `engagement_id` FKs | Planned audit procedures with ISA references |
| `audit_evidence` | `id` (PK), `org_id`, `engagement_id` FKs | Evidence items linked to procedures/documents |
| `audit_plans` | `id` (PK), `org_id`, `engagement_id` FKs | Versioned overall audit strategy records (ISA 300) |
| `materiality_sets` | `id` (PK), `org_id`, `engagement_id` FKs | Financial statement & performance materiality determinations (ISA 320) |
| `plan_change_log` | `id` (PK), `org_id`, `engagement_id`, `plan_id` FKs | Immutable log of plan updates, submissions, approvals (ISA 230) |
| `audit_risks` | `id` (PK), `org_id`, `engagement_id` FKs | Risk register entries with category, assertions, ratings, owner (ISA 315R) |
| `audit_risk_signals` | `id` (PK), `org_id`, `engagement_id` FKs | Analytics signals feeding the risk assessment (source, severity, metrics) |
| `audit_risk_activity` | `id` (PK), `org_id`, `engagement_id`, `risk_id` FKs | Reviewer/partner notes and workflow events tied to a risk |
| `audit_responses` | `id` (PK), `org_id`, `engagement_id`, `risk_id` FKs | Planned responses linking risks to controls, analytics, substantive work (ISA 330) |
| `audit_response_checks` | `id` (PK), `org_id`, `engagement_id`, `response_id` FKs | Completeness reviews ensuring planned responses cover assertions |
| `fraud_plans` | `id` (PK), `org_id`, `engagement_id` FKs | Fraud brainstorming, inherent risk assessment, responses, analytics plan (ISA 240) |
| `fraud_plan_actions` | `id` (PK), `org_id`, `engagement_id`, `fraud_plan_id` FKs | Timeline of fraud plan updates, approvals, communications |
| `group_components` | `id` (PK), `org_id`, `engagement_id` FKs | Group audit components with significance, materiality, and assigned firms |
| `group_instructions` | `id` (PK), `org_id`, `engagement_id`, `component_id` FKs | Instructions sent to component teams with status tracking |
| `group_workpapers` | `id` (PK), `org_id`, `engagement_id`, `component_id` FKs | Uploaded component workpapers linked to instructions/documents |
| `group_reviews` | `id` (PK), `org_id`, `engagement_id`, `component_id` FKs | Review workflow for component submissions (manager/EQR) |
| `specialist_assessments` | `id` (PK), `org_id`, `engagement_id` FKs | Reliance assessments for external specialists and internal audit |
| `journal_entry_strategies` | `id` (PK), `org_id`, `engagement_id` FKs | Journal entry testing scope, filters, thresholds, schedule |
| `kam_candidates` | `id` (PK), `org_id`, `engagement_id` FKs | Potential KAMs sourced from risks/estimates/GC/other |
| `kam_drafts` | `id` (PK), `org_id`, `engagement_id`, `candidate_id` FKs | Draft narratives with procedure/evidence references |
| `approval_queue` | `id` (PK), `org_id`, `engagement_id` FKs | Workflow queue for manager/partner/EQR approvals |
| `audit_report_drafts` | `id` (PK), `org_id`, `engagement_id` FKs | Opinion assembly with KAM linkage, EOM/OM toggles, approvals |
| `tcwg_packs` | `id` (PK), `org_id`, `engagement_id` FKs | ISA 260/265 TCWG communication pack with misstatements, deficiencies, approvals |
| `controls` | `id` (PK), `org_id`, `engagement_id` FKs | Control matrix (cycle, objective, frequency, owner, key) |
| `control_walkthroughs` | `id` (PK), `org_id`, `engagement_id`, `control_id` FKs | Design & implementation walkthrough evidence |
| `control_tests` | `id` (PK), `org_id`, `engagement_id`, `control_id` FKs | Attributes testing results with sampling metadata |
| `itgc_groups` | `id` (PK), `org_id`, `engagement_id` FKs | IT general control groupings (access/change/operations) |
| `engagement_archives` | `id` (PK), `engagement_id` unique | Archive manifest per engagement (SHA-256, TCWG evidence) |
| `client_background_checks` | `id` (PK), `org_id`, `client_id` FKs | KYC / sanctions screening metadata with risk rating |
| `independence_assessments` | `id` (PK), `org_id`, `client_id` FKs | Threats/safeguards conclusion for IESBA independence |
| `acceptance_decisions` | `id` (PK), `org_id`, `engagement_id` FKs | Partner acceptance decision, EQR requirement, approval status |
| `pbc_requests` | `id` (PK), `org_id`, `engagement_id` FKs | Provided-by-client requests with cycle, status, due dates, procedure mapping |
| `pbc_deliveries` | `id` (PK), `org_id`, `request_id` FKs | Delivered documents/notes linked to requests for evidence ingestion |
| `deficiencies` | `id` (PK), `org_id`, `engagement_id` FKs | Control deficiencies with severity/status feeding TCWG |
| `tax_entities` | `id` (PK), `org_id` FK | Malta tax entity registry (T‑1A) |
| `tax_entity_relationships` | `id` (PK), `org_id`, `parent_tax_entity_id`, `child_tax_entity_id` FKs | Ownership links between tax entities supporting Pillar Two tree modelling |
| `tax_accounts` | `id` (PK), `org_id`, `tax_entity_id` FKs | Malta tax accounts (MTA/FIA/IPA/FTA/UA) rollforward |
| `cit_computations` | `id` (PK), `org_id`, `tax_entity_id` FKs | Malta CIT computations with imputation/refund metadata |
| `participation_exemptions` | `id` (PK), `org_id`, `tax_entity_id` FKs | Participation exemption tests and conclusions |
| `return_files` | `id` (PK), `org_id`, `tax_entity_id` FKs | Filing payloads (CIT/VAT/etc.) with status tracking |
| `pillar_two_computations` | `id` (PK), `org_id`, `root_tax_entity_id` FKs | Pillar Two QDMTT/IIR computations with jurisdiction summaries and GIR payload |
| `treaty_wht_calculations` | `id` (PK), `org_id`, `tax_entity_id` FKs | Treaty withholding calculations (domestic vs treaty rate, relief method, metadata) |
| `tax_dispute_cases` | `id` (PK), `org_id`, `tax_entity_id` FKs | MAP/APA dispute register (status, relief amount, authority, timeline) |
| `tax_dispute_events` | `id` (PK), `org_id`, `dispute_id` FK | Timeline events recorded against MAP/APA cases |
| `us_tax_overlay_calculations` | `id` (PK), `org_id`, `tax_entity_id` FKs | US overlay computations (GILTI, §163(j), CAMT, §4501) with inputs/results & adjustments |

Row Level Security is enabled on all tables with helper functions `is_member_of` and `has_min_role` for access checks.

## Google Sheets
No schemas were found in the repository. Define tabs/columns and primary keys before production use. Suggested tabs:
- `tasks` (task exports)
- `clients` (client registry)
