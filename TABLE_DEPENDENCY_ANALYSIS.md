# Table Dependency Analysis Report

**Generated:** 2025-01-03

**Total Tables:** 219

**Total Foreign Keys:** 700

## Critical Tables (Most Referenced)


These tables are referenced by many other tables and should be consolidated first.


### `public.organizations`
- **Referenced By:** 157 table(s)
- **Dependents:**
  - `public.acceptance_decisions`
  - `public.accounting`
  - `public.activity_log`
  - `public.ada_runs`
  - `public.agent_actions`
  - `public.agent_audit_log`
  - `public.agent_conversations`
  - `public.agent_executions`
  - `public.agent_feedback`
  - `public.agent_guardrails`
- **Columns:** 10
- **Foreign Keys:** 0

### `public.engagements`
- **Referenced By:** 41 table(s)
- **Dependents:**
  - `public.acceptance_decisions`
  - `public.ada_runs`
  - `public.approval_queue`
  - `public.audit_evidence`
  - `public.audit_planned_procedures`
  - `public.audit_plans`
  - `public.audit_response_checks`
  - `public.audit_responses`
  - `public.audit_risk_activity`
  - `public.audit_risk_signals`
- **Depends On:**
  - `public.clients`
  - `public.organizations`
- **Columns:** 21
- **Foreign Keys:** 8

### `public.tax_entities`
- **Referenced By:** 16 table(s)
- **Dependents:**
  - `public.cfc_inclusions`
  - `public.cit_computations`
  - `public.dac6_arrangements`
  - `public.fiscal_unity_computations`
  - `public.interest_limitation_computations`
  - `public.nid_computations`
  - `public.participation_exemptions`
  - `public.patent_box_computations`
  - `public.pillar_two_computations`
  - `public.return_files`
- **Depends On:**
  - `public.organizations`
- **Columns:** 10
- **Foreign Keys:** 1

### `public.documents`
- **Referenced By:** 8 table(s)
- **Dependents:**
  - `public.audit_evidence`
  - `public.chunks`
  - `public.document_extractions`
  - `public.document_index`
  - `public.gdrive_documents`
  - `public.onboarding_checklist_items`
  - `public.reconciliations`
  - `public.task_attachments`
- **Depends On:**
  - `auth.users`
  - `public.engagements`
  - `public.entities`
  - `public.organizations`
  - `public.tasks`
- **Columns:** 34
- **Foreign Keys:** 16

### `public.users`
- **Referenced By:** 8 table(s)
- **Dependents:**
  - `public.agent_reasoning_traces`
  - `public.analytics_events`
  - `public.curated_knowledge_base`
  - `public.expert_annotations`
  - `public.learning_examples`
  - `public.learning_experiments`
  - `public.training_datasets`
  - `public.training_runs`
- **Depends On:**
  - `auth.users`
- **Columns:** 7
- **Foreign Keys:** 2

### `public.agents`
- **Referenced By:** 8 table(s)
- **Dependents:**
  - `public.agent_executions`
  - `public.agent_guardrail_assignments`
  - `public.agent_knowledge_assignments`
  - `public.agent_learning_examples`
  - `public.agent_personas`
  - `public.agent_tool_assignments`
  - `public.agent_versions`
  - `public.agents`
- **Depends On:**
  - `auth.users`
  - `public.agents`
  - `public.organizations`
- **Columns:** 16
- **Foreign Keys:** 6

### `public.knowledge_sources`
- **Referenced By:** 6 table(s)
- **Dependents:**
  - `public.agent_knowledge_assignments`
  - `public.gdrive_connectors`
  - `public.ingestion_jobs`
  - `public.knowledge_chunks`
  - `public.knowledge_documents`
  - `public.knowledge_sync_jobs`
- **Depends On:**
  - `public.jurisdictions`
  - `public.knowledge_corpora`
  - `public.organizations`
- **Columns:** 43
- **Foreign Keys:** 9

### `public.agent_sessions`
- **Referenced By:** 6 table(s)
- **Dependents:**
  - `public.agent_actions`
  - `public.agent_feedback`
  - `public.agent_logs`
  - `public.agent_runs`
  - `public.agent_traces`
  - `public.chatkit_sessions`
- **Depends On:**
  - `auth.users`
  - `public.app_users`
  - `public.organizations`
- **Columns:** 12
- **Foreign Keys:** 6

### `public.kb_documents`
- **Referenced By:** 4 table(s)
- **Dependents:**
  - `public.kb_chunks`
  - `public.kb_document_text`
  - `public.kb_summaries`
  - `public.kb_tags`
- **Depends On:**
  - `public.kb_sources`
  - `public.organizations`
- **Columns:** 27
- **Foreign Keys:** 2

### `public.clients`
- **Referenced By:** 4 table(s)
- **Dependents:**
  - `public.client_background_checks`
  - `public.engagements`
  - `public.independence_assessments`
  - `public.reconciliations`
- **Depends On:**
  - `public.organizations`
- **Columns:** 11
- **Foreign Keys:** 2

### `public.controls`
- **Referenced By:** 4 table(s)
- **Dependents:**
  - `public.control_tests`
  - `public.control_walkthroughs`
  - `public.deficiencies`
  - `public.tests`
- **Depends On:**
  - `public.engagements`
  - `public.organizations`
- **Columns:** 13
- **Foreign Keys:** 4

### `public.ledger_accounts`
- **Referenced By:** 4 table(s)
- **Dependents:**
  - `public.coa_map`
  - `public.ledger_accounts`
  - `public.ledger_entries`
  - `public.reconciliations`
- **Depends On:**
  - `public.engagements`
  - `public.ledger_accounts`
  - `public.organizations`
- **Columns:** 11
- **Foreign Keys:** 3

### `public.close_periods`
- **Referenced By:** 4 table(s)
- **Dependents:**
  - `public.close_pbc_items`
  - `public.je_control_alerts`
  - `public.reconciliations`
  - `public.variance_results`
- **Depends On:**
  - `auth.users`
  - `public.engagements`
  - `public.organizations`
- **Columns:** 11
- **Foreign Keys:** 3

### `public.agent_policy_versions`
- **Referenced By:** 4 table(s)
- **Dependents:**
  - `public.agent_learning_jobs`
  - `public.citation_canonicalizer`
  - `public.denylist_deboost`
  - `public.query_hints`
- **Depends On:**
  - `auth.users`
  - `public.organizations`
- **Columns:** 11
- **Foreign Keys:** 2

### `public.agent_execution_logs`
- **Referenced By:** 4 table(s)
- **Dependents:**
  - `public.agent_feedback`
  - `public.agent_learning_events`
  - `public.agent_rag_usage`
  - `public.agent_training_examples`
- **Columns:** 34
- **Foreign Keys:** 0

### `public.tasks`
- **Referenced By:** 3 table(s)
- **Dependents:**
  - `public.documents`
  - `public.task_attachments`
  - `public.task_comments`
- **Depends On:**
  - `auth.users`
  - `public.engagements`
  - `public.organizations`
- **Columns:** 13
- **Foreign Keys:** 10

### `public.app_users`
- **Referenced By:** 3 table(s)
- **Dependents:**
  - `public.agent_sessions`
  - `public.api_keys`
  - `public.members`
- **Depends On:**
  - `auth.users`
- **Columns:** 4
- **Foreign Keys:** 3

### `public.audit_risks`
- **Referenced By:** 3 table(s)
- **Dependents:**
  - `public.audit_responses`
  - `public.audit_risk_activity`
  - `public.audit_risk_signals`
- **Depends On:**
  - `auth.users`
  - `public.engagements`
  - `public.organizations`
- **Columns:** 20
- **Foreign Keys:** 5

### `public.dac6_arrangements`
- **Referenced By:** 3 table(s)
- **Dependents:**
  - `public.dac6_filings`
  - `public.dac6_hallmarks`
  - `public.dac6_participants`
- **Depends On:**
  - `auth.users`
  - `public.organizations`
  - `public.tax_entities`
- **Columns:** 12
- **Foreign Keys:** 4

### `public.jurisdictions`
- **Referenced By:** 3 table(s)
- **Dependents:**
  - `public.agent_queries_log`
  - `public.knowledge_chunks`
  - `public.knowledge_sources`
- **Columns:** 6
- **Foreign Keys:** 0

## User Management Tables Analysis


Found 10 user-related tables:


### `public.agent_profiles`
- **Defined In:** `20250923093000_agent_learning_tables.sql`
- **Columns:** 8
- **Key Columns:** certifications, created_at, id, jurisdictions, kind, org_id, reading_lists, style

### `public.app_users`
- **Defined In:** `20250830125756_a814a60a-2361-4a22-86ab-243f73b901ba.sql`
- **Referenced By:** 3 table(s)
  - `public.agent_sessions`
  - `public.api_keys`
  - `public.members`
- **Columns:** 4
- **Key Columns:** created_at, email, full_name, user_id

### `public.company_profile_drafts`
- **Defined In:** `20250926090000_tasks_documents_notifications.sql`
- **Columns:** 6
- **Key Columns:** checklist_id, created_at, extracted, id, org_id, updated_at

### `public.members`
- **Defined In:** `20250830125756_a814a60a-2361-4a22-86ab-243f73b901ba.sql`
- **Columns:** 3
- **Key Columns:** org_id, role, user_id

### `public.memberships`
- **Defined In:** `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
- **Columns:** 6
- **Key Columns:** created_at, id, org_id, role, updated_at, user_id

### `public.profiles`
- **Defined In:** `001_initial_schema.sql`
- **Referenced By:** 2 table(s)
  - `public.analytics_events`
  - `public.chat_sessions`
- **Columns:** 8
- **Key Columns:** avatar_url, created_at, email, full_name, id, metadata, role, updated_at

### `public.user_invitations`
- **Defined In:** `20260103010000_user_management_roles.sql`
- **Columns:** 10
- **Key Columns:** accepted_at, created_at, email, expires_at, id, invitation_token, invited_by, organization_id, role, status

### `public.user_notification_preferences`
- **Defined In:** `20251115090000_notification_fanout.sql`
- **Columns:** 8
- **Key Columns:** created_at, email_enabled, email_override, org_id, sms_enabled, sms_number, updated_at, user_id

### `public.user_profiles`
- **Defined In:** `20260103010000_user_management_roles.sql`
- **Columns:** 19
- **Key Columns:** activated_at, avatar_url, created_at, department, email, full_name, id, invited_at, invited_by, job_title

### `public.users`
- **Defined In:** `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
- **Referenced By:** 8 table(s)
  - `public.agent_reasoning_traces`
  - `public.analytics_events`
  - `public.curated_knowledge_base`
  - `public.expert_annotations`
  - `public.learning_examples`
- **Columns:** 7
- **Key Columns:** avatar_url, created_at, email, id, is_system_admin, name, updated_at

## Organization Tables Analysis


Found 1 organization-related tables:


### `public.organizations`
- **Defined In:** `20250830125756_a814a60a-2361-4a22-86ab-243f73b901ba.sql`
- **Referenced By:** 157 table(s)

## Foreign Key Relationships


Total: 700 relationships


### Most Referenced Tables

- `public.organizations`: 240 reference(s)
- `auth.users`: 136 reference(s)
- `public.engagements`: 55 reference(s)
- `public.jurisdictions`: 21 reference(s)
- `public.knowledge_sources`: 20 reference(s)
- `public.tax_entities`: 17 reference(s)
- `public.agents`: 15 reference(s)
- `public.users`: 14 reference(s)
- `public.documents`: 11 reference(s)
- `public.knowledge_documents`: 8 reference(s)
- `public.vendors`: 8 reference(s)
- `public.categories`: 8 reference(s)
- `public.app_users`: 7 reference(s)
- `public.agent_sessions`: 7 reference(s)
- `public.knowledge_chunks`: 7 reference(s)