# Data Model

## Table of Contents
- [Supabase Schema](#supabase-schema)
- [Google Sheets](#google-sheets)
- [Financial Invariants](#financial-invariants)
- [PII Classification](#pii-classification)

## Supabase Schema
The following tables are defined in migrations:

| Table | Key Columns | Description |
|---|---|---|
| `users` | `id` (PK, FK auth.users) | Profile for each auth user |
| `organizations` | `id` (PK) | Tenant organizations |
| `memberships` | `id` (PK), (`org_id`,`user_id`) unique | Links users to organizations with role, autonomy floor/ceiling, service account flag, and client portal scope |
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
| `agent_sessions` | `id` (PK), `org_id`, `engagement_id`, `started_by_user_id` FKs | Conversation instances for agents including agent type, status (`RUNNING/WAITING_APPROVAL/FAILED/DONE`), autonomy metadata, and optional Agent Platform identifiers (`openai_agent_id`, `openai_thread_id`) |
| `agent_runs` | `id` (PK), `org_id`, `session_id` FKs | Planner step execution summary (step index, JSON plan snapshot, run state) plus optional Agent Platform references (`openai_run_id`, `openai_response_id`) |
| `chatkit_sessions` | `id` (PK), `agent_session_id` FK | Stores ChatKit/OpenAI realtime session identifiers, status, and metadata for cancel/resume workflows |
| `agent_actions` | `id` (PK), `org_id`, `session_id`, `run_id` FKs | Individual tool invocation attempts capturing input/output JSON, sensitivity flag, requester, approval linkage |
| `agent_traces` | `id` (PK), `org_id`, `session_id`, `run_id` FKs | Structured telemetry per agent execution (`INFO/TOOL/ERROR`) with hashes, evidence, approval resumes |
| `agent_mcp_tools` | `id` (PK), `provider`, `tool_key` unique pair | MCP tool catalogue with JSON schema & metadata aligning local/external capabilities |
| `agent_manifests` | `id` (PK), `agent_key`, `version` unique pair | Manifest prompts, tool bindings, and safety metadata per agent persona |
| `agent_orchestration_sessions` | `id` (PK), `org_id` FK | Supabase-backed orchestration board linking Director/Safety agents to session objectives |
| `agent_orchestration_tasks` | `id` (PK), `session_id` FK | Task DAG for orchestrated workflows (domain agent assignment, inputs, outputs, status) |
| `agent_safety_events` | `id` (PK), `session_id` FK | Safety agent telemetry (rule triggers, escalations, HITL blocks) tied to sessions/tasks |
| `openai_debug_events` | `id` (PK), `request_id` unique, `org_id` FK | OpenAI Responses/Chat/Embedding debug metadata, captured for observability and troubleshooting |
| `tool_registry` | `id` (PK), `key` unique per `org_id` (nullable) | Catalogue of agent tools with label, description, minimum role, sensitivity, standards references, enabled flag |
| `approval_queue` | `id` (PK), `org_id`, `engagement_id` FKs | Unified approval queue (KAM/report/TCWG/tax/agent) storing stage, status, requester/approver, context JSON, agent session/action linkage, manifest/autonomy flags |
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
| `company_profile_drafts` | `id` (PK), `org_id`, `checklist_id` FKs | Draft entity profiles captured during onboarding with field-level provenance |
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

## Financial Invariants
- **Money Representation:** All monetary values must use the shared `Money` type from `packages/types-finance` with integer minor units or Decimal.js. Floating point types are prohibited.
- **JournalEntry:** Each entry must balance debits and credits. Prisma schema should enforce this via check constraints; application layer must validate before persisting.
- **LedgerAccount:** Accounts declare currency, jurisdiction, and posting rules. Cross-currency postings require explicit FX rates stored alongside the transaction.
- **TaxRule:** Rules are versioned with effective dates, jurisdiction codes, and traceable source references. Adjustments create append-only records with parent pointers.
- **AuditTrailEvent:** Every mutation on financial data records actor, trace_id, hash of payload, and reason code. Events are immutable.

## PII Classification
The following data classes must be tagged in code and infrastructure metadata to support GDPR requests and SOC 2 evidence collection:

| Data Element | Classification | Location | Notes |
|--------------|----------------|----------|-------|
| User profile (name, email) | Personal Data | `users`, `memberships` | Redact in logs; encrypted at rest |
| Client legal identifiers (TIN, VAT) | Sensitive Personal Data | `clients`, `tax_rules` | Access restricted to Admin role |
| Journal attachments | Confidential | Object storage `documents` | Virus-scan and run DLP before distribution |
| Agent conversation transcripts | Personal Data | `openai_debug_events` | Retain max 30 days; redact sensitive fields |

Tagging metadata should be reflected in IaC modules and synced with the data catalog. Update `security-privacy-checklist.md` when new fields are introduced.
