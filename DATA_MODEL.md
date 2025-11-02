# Data Model

## Table of Contents
- [Supabase Schema](#supabase-schema)
- [Google Sheets](#google-sheets)
- [Financial Invariants](#financial-invariants)
- [PII Classification](#pii-classification)

## Supabase Schema
The following tables are defined in migrations. Each bullet lists the primary keys/relationships, a short description, and **PII tags** that call out whether personal or sensitive data is stored.

**PII tag legend:** `Identifiers` (user IDs or other direct identifiers), `Contact` (email, phone, address), `Financial` (monetary or tax data), `Sensitive` (governance/risk/compliance narratives), `None` (no PII beyond technical metadata).

### Identity & Membership

- **`users`** (`id` PK, FK auth.users) — Profile entry for each authenticated user. **PII:** Identifiers, Contact.【F:supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql†L33-L55】
- **`app_users`** (`user_id` PK) — Supabase-facing profile mirror with email and full name. **PII:** Identifiers, Contact.【F:supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql†L33-L55】
- **`organizations`** (`id` PK) — Tenant organisation records with plan metadata. **PII:** None.【F:supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql†L25-L32】
- **`memberships`** (`org_id`,`user_id` PK) — Links users to organisations and tracks role/autonomy ranges. **PII:** Identifiers.【F:supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql†L33-L55】
- **`entities`** (`id` PK) — Entity registry tied to organisations capturing status, country, and metadata. **PII:** Sensitive (may hold beneficial ownership context).【F:supabase/migrations/20250926090000_tasks_documents_notifications.sql†L1-L33】
- **`clients`** (`id` PK, `org_id` FK) — Client records used for engagements. **PII:** Identifiers, Contact.
- **`client_background_checks`** (`id` PK) — Stores KYC screening outcomes and risk ratings. **PII:** Sensitive.【F:supabase/migrations/20250926090000_tasks_documents_notifications.sql†L313-L369】
- **`independence_assessments`** (`id` PK) — Captures threats/safeguards conclusions for independence. **PII:** Sensitive.
- **`acceptance_decisions`** (`id` PK) — Partner acceptance/evaluation decisions per engagement. **PII:** Sensitive.

### Engagement & Workflow

- **`engagements`** (`id` PK) — Engagement/project metadata per client. **PII:** Identifiers.
- **`tasks`** (`id` PK) — Work items with status, priority, assignee, and due dates. **PII:** Identifiers.【F:supabase/migrations/20250926090000_tasks_documents_notifications.sql†L35-L76】
- **`task_comments`** (`id` PK) — Comment threads on tasks, linked to author and organisation. **PII:** Identifiers.【F:supabase/migrations/20250926090000_tasks_documents_notifications.sql†L78-L107】
- **`task_attachments`** (`id` PK) — Attachment join table between tasks and documents. **PII:** Identifiers.【F:supabase/migrations/20250926090000_tasks_documents_notifications.sql†L200-L227】
- **`activity_log`** (`id` PK) — Audit log of user actions. **PII:** Identifiers.
- **`approval_queue`** (`id` PK) — Unified approval workflow entries referencing requesters/approvers. **PII:** Identifiers, Sensitive.
- **`notifications`** (`id` PK) — User notifications with urgency, link targets, and read state. **PII:** Identifiers.【F:supabase/migrations/20250926090000_tasks_documents_notifications.sql†L228-L270】
- **`notification_dispatch_queue`** (`id` PK) — Fan-out queue for email/SMS/webhook delivery. **PII:** Identifiers, Contact.【F:supabase/migrations/20251115090000_notification_fanout.sql†L1-L36】
- **`user_notification_preferences`** (`user_id`,`org_id` PK) — Stores opt-in flags and overrides for dispatch channels. **PII:** Contact.【F:supabase/migrations/20251115090000_notification_fanout.sql†L38-L66】
- **`jobs`** (`id` PK) — Background job queue with payloads and execution metadata. **PII:** None.【F:supabase/migrations/20250926090000_tasks_documents_notifications.sql†L360-L409】
- **`job_schedules`** (`id` PK) — Cron definitions for recurring jobs per organisation. **PII:** None.【F:supabase/migrations/20250926090000_tasks_documents_notifications.sql†L411-L441】
- **`system_settings`** (`id` PK) — Singleton configuration overrides plus chat-specific JSON. **PII:** None.【F:supabase/migrations/20251115114000_system_settings.sql†L1-L21】【F:supabase/migrations/20251115114500_chatkit_turn_config.sql†L1-L8】

### Documents & Knowledge

- **`documents`** (`id` PK) — Document metadata, classification, storage paths, and uploader details. **PII:** Sensitive.【F:supabase/migrations/20250926090000_tasks_documents_notifications.sql†L109-L190】
- **`document_index`** (`id` PK) — Full-text tokens and extracted metadata per document. **PII:** Sensitive.【F:supabase/migrations/20250926090000_tasks_documents_notifications.sql†L192-L214】
- **`document_extractions`** (`id` PK) — Structured extraction outputs, confidence, and provenance. **PII:** Sensitive.【F:supabase/migrations/20250926090000_tasks_documents_notifications.sql†L272-L315】
- **`chunks`** (`id` PK) — Vector chunks used for retrieval/embedding workflows. **PII:** Sensitive.
- **`ingest_jobs`** (`id` PK) — Knowledge ingestion jobs and payload metadata. **PII:** None.
- **`workpapers`** (`id` PK) — Uploaded workpaper metadata tied to engagements/components. **PII:** Sensitive.
- **`journal_entry_strategies`** (`id` PK) — Testing scope and thresholds for journal entry analytics. **PII:** Financial.

### Audit & Assurance

- **`estimate_register`** (`id` PK) — Accounting estimates with uncertainty. **PII:** Financial.
- **`going_concern_worksheets`** (`id` PK) — Going concern assessments and conclusions. **PII:** Sensitive.
- **`audit_module_records`** (`id` PK) — Workflow state for audit modules. **PII:** Sensitive.
- **`audit_record_approvals`** (`id` PK) — Approval snapshots for modules. **PII:** Identifiers, Sensitive.
- **`audit_plans`** (`id` PK) — Overall audit strategy versions. **PII:** Sensitive.
- **`audit_planned_procedures`** (`id` PK) — Planned procedures with ISA references. **PII:** Sensitive.
- **`audit_evidence`** (`id` PK) — Evidence items linked to procedures and documents. **PII:** Sensitive.
- **`materiality_sets`** (`id` PK) — Financial materiality thresholds. **PII:** Financial.
- **`plan_change_log`** (`id` PK) — Immutable audit plan updates. **PII:** Sensitive.
- **`audit_risks`** (`id` PK) — Risk register entries with ratings and assertions. **PII:** Sensitive.
- **`audit_risk_signals`** (`id` PK) — Analytics inputs feeding risk assessment. **PII:** Sensitive.
- **`audit_risk_activity`** (`id` PK) — Reviewer/partner notes and status changes. **PII:** Sensitive.
- **`audit_responses`** (`id` PK) — Planned responses linking risks to controls. **PII:** Sensitive.
- **`audit_response_checks`** (`id` PK) — Completeness checks on responses. **PII:** Sensitive.
- **`fraud_plans`** (`id` PK) — Fraud brainstorming outputs and responses. **PII:** Sensitive.
- **`fraud_plan_actions`** (`id` PK) — Timeline of fraud plan approvals. **PII:** Sensitive.
- **`group_components`** (`id` PK) — Group audit components with significance. **PII:** Sensitive.
- **`group_instructions`** (`id` PK) — Instructions sent to component teams. **PII:** Sensitive.
- **`group_workpapers`** (`id` PK) — Component workpapers and evidence. **PII:** Sensitive.
- **`group_reviews`** (`id` PK) — Review workflow for component submissions. **PII:** Sensitive.
- **`specialist_assessments`** (`id` PK) — Reliance assessments for specialists/internal audit. **PII:** Sensitive.
- **`kam_candidates`** (`id` PK) — Potential key audit matters. **PII:** Sensitive.
- **`kam_drafts`** (`id` PK) — Draft KAM narratives with references. **PII:** Sensitive.
- **`audit_report_drafts`** (`id` PK) — Report assembly, KAM linkage, approvals. **PII:** Sensitive.
- **`tcwg_packs`** (`id` PK) — TCWG communications, misstatements, deficiencies. **PII:** Sensitive.
- **`controls`** (`id` PK) — Control matrix entries. **PII:** Sensitive.
- **`control_walkthroughs`** (`id` PK) — Walkthrough evidence for controls. **PII:** Sensitive.
- **`control_tests`** (`id` PK) — Testing results with samples. **PII:** Sensitive.
- **`itgc_groups`** (`id` PK) — ITGC group definitions. **PII:** Sensitive.
- **`deficiencies`** (`id` PK) — Control deficiencies and status. **PII:** Sensitive.
- **`engagement_archives`** (`id` PK) — Archive manifests with hashes and evidence references. **PII:** Sensitive.

### Agent Platform & Automations

- **`agent_sessions`** (`id` PK) — Agent conversations, autonomy metadata, and platform IDs. **PII:** Identifiers, Sensitive.
- **`agent_runs`** (`id` PK) — Planner execution snapshots per session. **PII:** Identifiers.
- **`chatkit_sessions`** (`id` PK) — ChatKit/OpenAI realtime session metadata. **PII:** Identifiers.【F:supabase/migrations/20251115113000_chatkit_sessions.sql†L1-L24】
- **`chatkit_session_transcripts`** (`id` PK) — Transcript payloads and metadata for ChatKit sessions. **PII:** Sensitive.【F:supabase/migrations/20251115121500_chatkit_session_transcripts.sql†L1-L33】
- **`agent_actions`** (`id` PK) — Tool invocation attempts, payloads, and approvals. **PII:** Sensitive.
- **`agent_traces`** (`id` PK) — Structured telemetry with evidence references. **PII:** Sensitive.【F:supabase/migrations/20250926090000_tasks_documents_notifications.sql†L272-L308】
- **`agent_mcp_tools`** (`id` PK) — MCP tool catalogue for agent platform. **PII:** None.
- **`agent_manifests`** (`id` PK) — Manifest prompt and binding metadata. **PII:** None.
- **`agent_orchestration_sessions`** (`id` PK) — Director/safety orchestration boards. **PII:** Sensitive.
- **`agent_orchestration_tasks`** (`id` PK) — DAG tasks with inputs/outputs. **PII:** Sensitive.
- **`agent_safety_events`** (`id` PK) — Safety telemetry and escalations. **PII:** Sensitive.
- **`openai_debug_events`** (`id` PK) — Request/response debug metadata. **PII:** Sensitive.
- **`tool_registry`** (`id` PK) — Agent tool catalogue per organisation. **PII:** Sensitive.

### Onboarding & Client Collaboration

- **`onboarding_checklists`** (`id` PK) — Interim entity onboarding workflows. **PII:** Sensitive.【F:supabase/migrations/20250926090000_tasks_documents_notifications.sql†L317-L351】
- **`onboarding_checklist_items`** (`id` PK) — Checklist line items with document links. **PII:** Sensitive.【F:supabase/migrations/20250926090000_tasks_documents_notifications.sql†L353-L383】
- **`company_profile_drafts`** (`id` PK) — Draft entity profiles during onboarding. **PII:** Sensitive.【F:supabase/migrations/20250926090000_tasks_documents_notifications.sql†L385-L409】
- **`pbc_requests`** (`id` PK) — Provided-by-client requests with cycle metadata. **PII:** Sensitive.【F:supabase/migrations/20250926090000_tasks_documents_notifications.sql†L409-L430】
- **`pbc_deliveries`** (`id` PK) — Delivered artefacts linked to requests. **PII:** Sensitive.【F:supabase/migrations/20250926090000_tasks_documents_notifications.sql†L430-L445】

### Analytics & Telemetry

- **`analytics_events`** (`id` PK) — Central analytics and telemetry payloads. **PII:** Identifiers.【F:supabase/migrations/20251201090000_analytics_events.sql†L1-L34】
- **`nps_responses`** (`id` PK) — NPS survey scores and feedback. **PII:** Identifiers, Sensitive.【F:supabase/migrations/20250930120000_nps_responses.sql†L1-L26】
- **`web_fetch_cache`** (`id` PK) — Cached web harvest content and metadata. **PII:** None.【F:supabase/migrations/20251115122000_web_fetch_cache.sql†L1-L34】
- **`web_fetch_cache_metrics`** (view) — Aggregated freshness/size metrics. **PII:** None.【F:supabase/migrations/20251115123000_web_fetch_cache_retention.sql†L1-L33】

### Tax & Regulatory Reporting

- **`tax_entities`** (`id` PK) — Registry of tax entities per organisation. **PII:** Sensitive.
- **`tax_entity_relationships`** (`id` PK) — Ownership hierarchy between tax entities. **PII:** Sensitive.
- **`tax_accounts`** (`id` PK) — Jurisdiction tax accounts with balances. **PII:** Financial.
- **`cit_computations`** (`id` PK) — Corporate income tax computations. **PII:** Financial.
- **`participation_exemptions`** (`id` PK) — Participation exemption evaluations. **PII:** Financial.
- **`return_files`** (`id` PK) — Filing payloads and status. **PII:** Financial.
- **`pillar_two_computations`** (`id` PK) — Pillar Two calculations and jurisdiction summaries. **PII:** Financial.
- **`treaty_wht_calculations`** (`id` PK) — Withholding tax computations and relief. **PII:** Financial.
- **`tax_dispute_cases`** (`id` PK) — MAP/APA dispute registry. **PII:** Sensitive.
- **`tax_dispute_events`** (`id` PK) — Timeline events for disputes. **PII:** Sensitive.
- **`us_tax_overlay_calculations`** (`id` PK) — US overlay computations (GILTI, §163(j), CAMT, §4501). **PII:** Financial.

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
