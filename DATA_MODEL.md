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
| `audit_planned_procedures` | `id` (PK), `org_id`, `engagement_id` FKs | Planned audit procedures with ISA references |
| `audit_evidence` | `id` (PK), `org_id`, `engagement_id` FKs | Evidence items linked to procedures/documents |
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

Row Level Security is enabled on all tables with helper functions `is_member_of` and `has_min_role` for access checks.

## Google Sheets
No schemas were found in the repository. Define tabs/columns and primary keys before production use. Suggested tabs:
- `n8n_state` (idempotency keys, processed flags)
- `tasks` (task exports)
- `clients` (client registry)
