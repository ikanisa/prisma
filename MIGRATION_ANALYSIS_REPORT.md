# Migration Analysis Report

**Generated:** 2026-01-03 02:07:02

**Total Migrations:** 155

## Executive Summary

- **Total Tables:** 219
- **Duplicate Table Definitions:** 64
- **Total Functions:** 68
- **Duplicate Function Definitions:** 18
- **Total Enums:** 61
- **Duplicate Enum Definitions:** 6
- **Foreign Key Relationships:** 713

## Table Analysis


### All Tables (219 total)


#### `public.acceptance_decisions`
- **First Seen:** `20251113093000_audit_acceptance_foundation.sql`
- **Defined In:** 1 file(s)

#### `public.accounting`
- **First Seen:** `20250921090001_backfill_core_tables.sql`
- **Defined In:** 1 file(s)

#### `public.activity_event_catalog`
- **First Seen:** `20250924112000_activity_log_enrichment.sql`
- **Defined In:** 1 file(s)

#### `public.activity_log`
- **First Seen:** `20250821115117_.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250821115117_.sql`
  - `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`

#### `public.ada_exceptions`
- **First Seen:** `20251111090000_audit_ctrl1_ada1_rec1.sql`
- **Defined In:** 1 file(s)

#### `public.ada_runs`
- **First Seen:** `20251111090000_audit_ctrl1_ada1_rec1.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.ada_runs
- **Dependents:** public.ada_runs

#### `public.agent_actions`
- **First Seen:** `20251115093000_agent_hitl_extensions.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.agent_actions
- **Dependents:** public.agent_actions

#### `public.agent_audit_log`
- **First Seen:** `20251202000307_agent_production_system.sql`
- **Defined In:** 1 file(s)

#### `public.agent_conversation_messages`
- **First Seen:** `20251202000307_agent_production_system.sql`
- **Defined In:** 1 file(s)

#### `public.agent_conversations`
- **First Seen:** `20251202000307_agent_production_system.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.agent_conversations
- **Dependents:** public.agent_conversations

#### `public.agent_daily_stats`
- **First Seen:** `20260201170000_agent_analytics_schema.sql`
- **Defined In:** 1 file(s)

#### `public.agent_execution_logs`
- **First Seen:** `20260201170000_agent_analytics_schema.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.agent_execution_logs
- **Dependents:** public.agent_execution_logs

#### `public.agent_executions`
- **First Seen:** `20251202000307_agent_production_system.sql`
- **Defined In:** 4 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20251202000307_agent_production_system.sql`
  - `20260128000000_ai_agent_system_comprehensive.sql`
  - `20260201000000_comprehensive_agent_portal.sql`
  - `20260201170000_specialist_agent_executions.sql`
- **Dependencies:** public.agent_executions
- **Dependents:** public.agent_executions

#### `public.agent_feedback`
- **First Seen:** `20250923093000_agent_learning_tables.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250923093000_agent_learning_tables.sql`
  - `20260201170000_agent_analytics_schema.sql`

#### `public.agent_guardrail_assignments`
- **First Seen:** `20260128000000_ai_agent_system_comprehensive.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20260128000000_ai_agent_system_comprehensive.sql`
  - `20260201000000_comprehensive_agent_portal.sql`

#### `public.agent_guardrails`
- **First Seen:** `20260128000000_ai_agent_system_comprehensive.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20260128000000_ai_agent_system_comprehensive.sql`
  - `20260201000000_comprehensive_agent_portal.sql`
- **Dependencies:** public.agent_guardrails
- **Dependents:** public.agent_guardrails

#### `public.agent_knowledge_assignments`
- **First Seen:** `20250115000000_agent_knowledge_system.sql`
- **Defined In:** 3 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250115000000_agent_knowledge_system.sql`
  - `20260128000000_ai_agent_system_comprehensive.sql`
  - `20260201000000_comprehensive_agent_portal.sql`

#### `public.agent_knowledge_sources`
- **First Seen:** `20260128000000_ai_agent_system_comprehensive.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.agent_knowledge_sources
- **Dependents:** public.agent_knowledge_sources

#### `public.agent_learning_events`
- **First Seen:** `20260201180000_agent_feedback_loop.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.agent_learning_events
- **Dependents:** public.agent_learning_events

#### `public.agent_learning_examples`
- **First Seen:** `20260128000000_ai_agent_system_comprehensive.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20260128000000_ai_agent_system_comprehensive.sql`
  - `20260201000000_comprehensive_agent_portal.sql`

#### `public.agent_learning_jobs`
- **First Seen:** `20250927114500_learning_loop_tables.sql`
- **Defined In:** 1 file(s)

#### `public.agent_logs`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`

#### `public.agent_manifests`
- **First Seen:** `20251115110000_agent_mcp_schema.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.agent_manifests
- **Dependents:** public.agent_manifests

#### `public.agent_mcp_tools`
- **First Seen:** `20251115110000_agent_mcp_schema.sql`
- **Defined In:** 1 file(s)

#### `public.agent_orchestration_sessions`
- **First Seen:** `20251115110000_agent_mcp_schema.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.agent_orchestration_sessions
- **Dependents:** public.agent_orchestration_sessions

#### `public.agent_orchestration_tasks`
- **First Seen:** `20251115110000_agent_mcp_schema.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.agent_orchestration_tasks
- **Dependents:** public.agent_orchestration_tasks

#### `public.agent_personas`
- **First Seen:** `20260128000000_ai_agent_system_comprehensive.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20260128000000_ai_agent_system_comprehensive.sql`
  - `20260201000000_comprehensive_agent_portal.sql`
- **Dependencies:** public.agent_personas
- **Dependents:** public.agent_personas

#### `public.agent_policy_versions`
- **First Seen:** `20250927114500_learning_loop_tables.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.agent_policy_versions
- **Dependents:** public.agent_policy_versions

#### `public.agent_profiles`
- **First Seen:** `20250923093000_agent_learning_tables.sql`
- **Defined In:** 1 file(s)

#### `public.agent_queries_log`
- **First Seen:** `20251201000000_accounting_kb_comprehensive.sql`
- **Defined In:** 7 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20251201000000_accounting_kb_comprehensive.sql`
  - `20251201170000_accounting_knowledge_base.sql`
  - `20251201180000_accounting_kb_comprehensive.sql`
  - `20251201210000_accounting_kb.sql`
  - `20251201_accounting_kb.sql`
  - `20251201_accounting_knowledge_base.sql`
  - `20260201150000_accounting_kb_comprehensive.sql`

#### `public.agent_rag_usage`
- **First Seen:** `20260201170000_agent_analytics_schema.sql`
- **Defined In:** 1 file(s)

#### `public.agent_reasoning_traces`
- **First Seen:** `20260201100000_curated_knowledge_base.sql`
- **Defined In:** 1 file(s)

#### `public.agent_runs`
- **First Seen:** `20251115093000_agent_hitl_extensions.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.agent_runs
- **Dependents:** public.agent_runs

#### `public.agent_safety_events`
- **First Seen:** `20251115110000_agent_mcp_schema.sql`
- **Defined In:** 1 file(s)

#### `public.agent_sessions`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 3 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250921090001_backfill_core_tables.sql`
- **Dependencies:** public.agent_sessions
- **Dependents:** public.agent_sessions

#### `public.agent_test_runs`
- **First Seen:** `20260201190000_agent_testing_schema.sql`
- **Defined In:** 1 file(s)

#### `public.agent_tool_assignments`
- **First Seen:** `20260128000000_ai_agent_system_comprehensive.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20260128000000_ai_agent_system_comprehensive.sql`
  - `20260201000000_comprehensive_agent_portal.sql`

#### `public.agent_tools`
- **First Seen:** `20260128000000_ai_agent_system_comprehensive.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20260128000000_ai_agent_system_comprehensive.sql`
  - `20260201000000_comprehensive_agent_portal.sql`
- **Dependencies:** public.agent_tools
- **Dependents:** public.agent_tools

#### `public.agent_trace`
- **First Seen:** `20250926090000_tasks_documents_notifications.sql`
- **Defined In:** 1 file(s)

#### `public.agent_traces`
- **First Seen:** `20251115093000_agent_hitl_extensions.sql`
- **Defined In:** 1 file(s)

#### `public.agent_training_examples`
- **First Seen:** `20260201180000_agent_feedback_loop.sql`
- **Defined In:** 1 file(s)

#### `public.agent_usage_quotas`
- **First Seen:** `20251202000307_agent_production_system.sql`
- **Defined In:** 1 file(s)

#### `public.agent_versions`
- **First Seen:** `20260201000000_comprehensive_agent_portal.sql`
- **Defined In:** 1 file(s)

#### `public.agents`
- **First Seen:** `20260128000000_ai_agent_system_comprehensive.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20260128000000_ai_agent_system_comprehensive.sql`
  - `20260201000000_comprehensive_agent_portal.sql`
- **Dependencies:** public.agents
- **Dependents:** public.agents

#### `public.analytics_events`
- **First Seen:** `001_initial_schema.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `001_initial_schema.sql`
  - `20251201090000_analytics_events.sql`

#### `public.api_keys`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`

#### `public.app_users`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 3 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250830125756_a814a60a-2361-4a22-86ab-243f73b901ba.sql`
- **Dependencies:** public.app_users
- **Dependents:** public.app_users

#### `public.approval_queue`
- **First Seen:** `20251113093000_audit_acceptance_foundation.sql`
- **Defined In:** 1 file(s)

#### `public.audit`
- **First Seen:** `20250921090001_backfill_core_tables.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.audit_planned_procedures, public.audit_plans, public.audit_responses, public.audit_risks

#### `public.audit_evidence`
- **First Seen:** `20250924135000_audit_kam_schema.sql`
- **Defined In:** 1 file(s)

#### `public.audit_planned_procedures`
- **First Seen:** `20250924135000_audit_kam_schema.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.audit_planned_procedures
- **Dependents:** public.audit, public.audit_planned_procedures

#### `public.audit_plans`
- **First Seen:** `20250924095000_audit_plan_strategy_materiality.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.audit_plans
- **Dependents:** public.audit, public.audit_plans

#### `public.audit_response_checks`
- **First Seen:** `20250924124000_audit_responses_matrix.sql`
- **Defined In:** 1 file(s)

#### `public.audit_responses`
- **First Seen:** `20250924124000_audit_responses_matrix.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.audit_responses
- **Dependents:** public.audit, public.audit_responses

#### `public.audit_risk_activity`
- **First Seen:** `20250924120000_audit_risk_register.sql`
- **Defined In:** 1 file(s)

#### `public.audit_risk_signals`
- **First Seen:** `20250924120000_audit_risk_register.sql`
- **Defined In:** 1 file(s)

#### `public.audit_risks`
- **First Seen:** `20250924120000_audit_risk_register.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.audit_risks
- **Dependents:** public.audit, public.audit_risks

#### `public.categories`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 4 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250901062854_.sql`
  - `20250901062855_139c4e89-6510-4395-988c-25ffdf993c21.sql`
- **Dependencies:** public.categories
- **Dependents:** public.categories

#### `public.cfc_inclusions`
- **First Seen:** `20250924152000_tax_mt_atad_ilr_cfc.sql`
- **Defined In:** 1 file(s)

#### `public.chart_of_accounts`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 4 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250901062854_.sql`
  - `20250901062855_139c4e89-6510-4395-988c-25ffdf993c21.sql`
- **Dependencies:** public.chart_of_accounts
- **Dependents:** public.chart_of_accounts

#### `public.chat_messages`
- **First Seen:** `001_initial_schema.sql`
- **Defined In:** 1 file(s)

#### `public.chat_sessions`
- **First Seen:** `001_initial_schema.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.chat_sessions
- **Dependents:** public.chat_sessions

#### `public.chatkit_session_transcripts`
- **First Seen:** `20251115121500_chatkit_session_transcripts.sql`
- **Defined In:** 1 file(s)

#### `public.chatkit_sessions`
- **First Seen:** `20251115113000_chatkit_sessions.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.chatkit_sessions
- **Dependents:** public.chatkit_sessions

#### `public.chunks`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 4 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250901062854_.sql`
  - `20250901062855_139c4e89-6510-4395-988c-25ffdf993c21.sql`

#### `public.cit_computations`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 3 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250924100500_tax_mt_cit_imputation.sql`

#### `public.citation_canonicalizer`
- **First Seen:** `20250927114500_learning_loop_tables.sql`
- **Defined In:** 1 file(s)

#### `public.classification_improvements`
- **First Seen:** `20260201180000_agent_feedback_loop.sql`
- **Defined In:** 1 file(s)

#### `public.client_background_checks`
- **First Seen:** `20251113093000_audit_acceptance_foundation.sql`
- **Defined In:** 1 file(s)

#### `public.clients`
- **First Seen:** `20250821115117_.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250821115117_.sql`
  - `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
- **Dependencies:** public.clients
- **Dependents:** public.clients

#### `public.close_pbc_items`
- **First Seen:** `20250924103000_accounting_close_gl.sql`
- **Defined In:** 1 file(s)

#### `public.close_periods`
- **First Seen:** `20250924103000_accounting_close_gl.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.close_periods
- **Dependents:** public.close_periods

#### `public.coa_map`
- **First Seen:** `20250924103000_accounting_close_gl.sql`
- **Defined In:** 1 file(s)

#### `public.company_profile_drafts`
- **First Seen:** `20250926090000_tasks_documents_notifications.sql`
- **Defined In:** 1 file(s)

#### `public.control_tests`
- **First Seen:** `20251111090000_audit_ctrl1_ada1_rec1.sql`
- **Defined In:** 1 file(s)

#### `public.control_walkthroughs`
- **First Seen:** `20251111090000_audit_ctrl1_ada1_rec1.sql`
- **Defined In:** 1 file(s)

#### `public.controls`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 3 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20251111090000_audit_ctrl1_ada1_rec1.sql`
- **Dependencies:** public.controls
- **Dependents:** public.controls

#### `public.conversation_messages`
- **First Seen:** `20241201_conversations_schema.sql`
- **Defined In:** 1 file(s)

#### `public.conversations`
- **First Seen:** `20241201_conversations_schema.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.conversations
- **Dependents:** public.conversations

#### `public.curated_knowledge_base`
- **First Seen:** `20260201100000_curated_knowledge_base.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.curated_knowledge_base
- **Dependents:** public.curated_knowledge_base

#### `public.dac6_arrangements`
- **First Seen:** `20250924182000_tax_dac6_schema.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.dac6_arrangements
- **Dependents:** public.dac6_arrangements

#### `public.dac6_filings`
- **First Seen:** `20250924182000_tax_dac6_schema.sql`
- **Defined In:** 1 file(s)

#### `public.dac6_hallmarks`
- **First Seen:** `20250924182000_tax_dac6_schema.sql`
- **Defined In:** 1 file(s)

#### `public.dac6_participants`
- **First Seen:** `20250924182000_tax_dac6_schema.sql`
- **Defined In:** 1 file(s)

#### `public.dataset_examples`
- **First Seen:** `20260128100000_agent_learning_system_comprehensive.sql`
- **Defined In:** 1 file(s)

#### `public.deep_search_sources`
- **First Seen:** `20260201100000_curated_knowledge_base.sql`
- **Defined In:** 1 file(s)

#### `public.deficiencies`
- **First Seen:** `20251111090000_audit_ctrl1_ada1_rec1.sql`
- **Defined In:** 1 file(s)

#### `public.denylist_deboost`
- **First Seen:** `20250927114500_learning_loop_tables.sql`
- **Defined In:** 1 file(s)

#### `public.document_extractions`
- **First Seen:** `20250926090000_tasks_documents_notifications.sql`
- **Defined In:** 1 file(s)

#### `public.document_index`
- **First Seen:** `20250926090000_tasks_documents_notifications.sql`
- **Defined In:** 1 file(s)

#### `public.documents`
- **First Seen:** `001_initial_schema.sql`
- **Defined In:** 8 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `001_initial_schema.sql`
  - `20250821115117_.sql`
  - `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250901062854_.sql`
  - `20250901062855_139c4e89-6510-4395-988c-25ffdf993c21.sql`
  - `20250926090000_tasks_documents_notifications.sql`
- **Dependencies:** public.documents
- **Dependents:** public.documents

#### `public.engagements`
- **First Seen:** `20250821115117_.sql`
- **Defined In:** 6 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250821115117_.sql`
  - `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250901062854_.sql`
  - `20250901062855_139c4e89-6510-4395-988c-25ffdf993c21.sql`
- **Dependencies:** public.engagements
- **Dependents:** public.engagements

#### `public.entities`
- **First Seen:** `20250926090000_tasks_documents_notifications.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.entities
- **Dependents:** public.entities

#### `public.errors`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`

#### `public.estimate_register`
- **First Seen:** `20250924135000_audit_kam_schema.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.estimate_register
- **Dependents:** public.estimate_register

#### `public.expert_annotations`
- **First Seen:** `20260128100000_agent_learning_system_comprehensive.sql`
- **Defined In:** 1 file(s)

#### `public.feedback_loop_metrics`
- **First Seen:** `20260201180000_agent_feedback_loop.sql`
- **Defined In:** 1 file(s)

#### `public.fiscal_unity_computations`
- **First Seen:** `20250924164000_tax_mt_fiscal_unity.sql`
- **Defined In:** 1 file(s)

#### `public.fraud_plan_actions`
- **First Seen:** `20250924130000_fraud_plan_je_strategy.sql`
- **Defined In:** 1 file(s)

#### `public.fraud_plans`
- **First Seen:** `20250924130000_fraud_plan_je_strategy.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.fraud_plans
- **Dependents:** public.fraud_plans

#### `public.fs_lines`
- **First Seen:** `20250924103000_accounting_close_gl.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.fs_lines
- **Dependents:** public.fs_lines

#### `public.gdrive_change_queue`
- **First Seen:** `20250927113000_gdrive_ingestion_tables.sql`
- **Defined In:** 1 file(s)

#### `public.gdrive_connectors`
- **First Seen:** `20250927113000_gdrive_ingestion_tables.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.gdrive_connectors
- **Dependents:** public.gdrive_connectors

#### `public.gdrive_documents`
- **First Seen:** `20250927113000_gdrive_ingestion_tables.sql`
- **Defined In:** 1 file(s)

#### `public.gdrive_file_metadata`
- **First Seen:** `20250927113000_gdrive_ingestion_tables.sql`
- **Defined In:** 1 file(s)

#### `public.going_concern_worksheets`
- **First Seen:** `20250924135000_audit_kam_schema.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.going_concern_worksheets
- **Dependents:** public.going_concern_worksheets

#### `public.idempotency_keys`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 4 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250924225000_idempotency_keys.sql`
  - `20250925221000_idempotency_keys_patch.sql`

#### `public.independence_assessments`
- **First Seen:** `20251113093000_audit_acceptance_foundation.sql`
- **Defined In:** 1 file(s)

#### `public.independence_checks`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 4 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250901062854_.sql`
  - `20250901062855_139c4e89-6510-4395-988c-25ffdf993c21.sql`

#### `public.ingest_jobs`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`

#### `public.ingestion_files`
- **First Seen:** `20251201000000_accounting_kb_comprehensive.sql`
- **Defined In:** 7 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20251201000000_accounting_kb_comprehensive.sql`
  - `20251201170000_accounting_knowledge_base.sql`
  - `20251201180000_accounting_kb_comprehensive.sql`
  - `20251201210000_accounting_kb.sql`
  - `20251201_accounting_kb.sql`
  - `20251201_accounting_knowledge_base.sql`
  - `20260201150000_accounting_kb_comprehensive.sql`

#### `public.ingestion_jobs`
- **First Seen:** `20251201000000_accounting_kb_comprehensive.sql`
- **Defined In:** 7 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20251201000000_accounting_kb_comprehensive.sql`
  - `20251201170000_accounting_knowledge_base.sql`
  - `20251201180000_accounting_kb_comprehensive.sql`
  - `20251201210000_accounting_kb.sql`
  - `20251201_accounting_kb.sql`
  - `20251201_accounting_knowledge_base.sql`
  - `20260201150000_accounting_kb_comprehensive.sql`
- **Dependencies:** public.ingestion_jobs
- **Dependents:** public.ingestion_jobs

#### `public.interest_limitation_computations`
- **First Seen:** `20250924152000_tax_mt_atad_ilr_cfc.sql`
- **Defined In:** 1 file(s)

#### `public.itgc_groups`
- **First Seen:** `20251111090000_audit_ctrl1_ada1_rec1.sql`
- **Defined In:** 1 file(s)

#### `public.je_control_alerts`
- **First Seen:** `20250924103000_accounting_close_gl.sql`
- **Defined In:** 1 file(s)

#### `public.job_schedules`
- **First Seen:** `20250926090000_tasks_documents_notifications.sql`
- **Defined In:** 1 file(s)

#### `public.jobs`
- **First Seen:** `20250926090000_tasks_documents_notifications.sql`
- **Defined In:** 1 file(s)

#### `public.journal_batches`
- **First Seen:** `20250924103000_accounting_close_gl.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.journal_batches
- **Dependents:** public.journal_batches

#### `public.journal_entries`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
- **Dependencies:** public.journal_entries
- **Dependents:** public.journal_entries

#### `public.journal_entry_strategies`
- **First Seen:** `20250924130000_fraud_plan_je_strategy.sql`
- **Defined In:** 1 file(s)

#### `public.journal_lines`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`

#### `public.jurisdictions`
- **First Seen:** `20251201000000_accounting_kb_comprehensive.sql`
- **Defined In:** 7 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20251201000000_accounting_kb_comprehensive.sql`
  - `20251201170000_accounting_knowledge_base.sql`
  - `20251201180000_accounting_kb_comprehensive.sql`
  - `20251201210000_accounting_kb.sql`
  - `20251201_accounting_kb.sql`
  - `20251201_accounting_knowledge_base.sql`
  - `20260201150000_accounting_kb_comprehensive.sql`
- **Dependencies:** public.jurisdictions
- **Dependents:** public.jurisdictions

#### `public.kam_candidates`
- **First Seen:** `20250924135000_audit_kam_schema.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.kam_candidates
- **Dependents:** public.kam_candidates

#### `public.kam_drafts`
- **First Seen:** `20250924135000_audit_kam_schema.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.kam_drafts
- **Dependents:** public.kam_drafts

#### `public.kams`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`

#### `public.kb_audit_trail`
- **First Seen:** `20260103000000_kb_comprehensive_schema.sql`
- **Defined In:** 1 file(s)

#### `public.kb_chunks`
- **First Seen:** `20260103000000_kb_comprehensive_schema.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.kb_chunks
- **Dependents:** public.kb_chunks

#### `public.kb_document_text`
- **First Seen:** `20260103000000_kb_comprehensive_schema.sql`
- **Defined In:** 1 file(s)

#### `public.kb_documents`
- **First Seen:** `20241201120000_kb_documents_schema.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20241201120000_kb_documents_schema.sql`
  - `20260103000000_kb_comprehensive_schema.sql`
- **Dependencies:** public.kb_documents
- **Dependents:** public.kb_documents

#### `public.kb_embeddings`
- **First Seen:** `20260103000000_kb_comprehensive_schema.sql`
- **Defined In:** 1 file(s)

#### `public.kb_runs`
- **First Seen:** `20260103000000_kb_comprehensive_schema.sql`
- **Defined In:** 1 file(s)

#### `public.kb_sources`
- **First Seen:** `20260103000000_kb_comprehensive_schema.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.kb_sources
- **Dependents:** public.kb_sources

#### `public.kb_summaries`
- **First Seen:** `20260103000000_kb_comprehensive_schema.sql`
- **Defined In:** 1 file(s)

#### `public.kb_tags`
- **First Seen:** `20260103000000_kb_comprehensive_schema.sql`
- **Defined In:** 1 file(s)

#### `public.knowledge_chunks`
- **First Seen:** `20250115000000_agent_knowledge_system.sql`
- **Defined In:** 9 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250115000000_agent_knowledge_system.sql`
  - `20251201000000_accounting_kb_comprehensive.sql`
  - `20251201170000_accounting_knowledge_base.sql`
  - `20251201180000_accounting_kb_comprehensive.sql`
  - `20251201210000_accounting_kb.sql`
  - `20251201_accounting_kb.sql`
  - `20251201_accounting_knowledge_base.sql`
  - `20260201150000_accounting_kb_comprehensive.sql`
  - `20260201160000_rag_ingestion_pipeline.sql`
- **Dependencies:** public.knowledge_chunks
- **Dependents:** public.knowledge_chunks

#### `public.knowledge_corpora`
- **First Seen:** `20250923093000_agent_learning_tables.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.knowledge_corpora
- **Dependents:** public.knowledge_corpora

#### `public.knowledge_documents`
- **First Seen:** `20250115000000_agent_knowledge_system.sql`
- **Defined In:** 8 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250115000000_agent_knowledge_system.sql`
  - `20251201000000_accounting_kb_comprehensive.sql`
  - `20251201170000_accounting_knowledge_base.sql`
  - `20251201180000_accounting_kb_comprehensive.sql`
  - `20251201210000_accounting_kb.sql`
  - `20251201_accounting_kb.sql`
  - `20251201_accounting_knowledge_base.sql`
  - `20260201150000_accounting_kb_comprehensive.sql`
- **Dependencies:** public.knowledge_documents
- **Dependents:** public.knowledge_documents

#### `public.knowledge_embeddings`
- **First Seen:** `20251201000000_accounting_kb_comprehensive.sql`
- **Defined In:** 7 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20251201000000_accounting_kb_comprehensive.sql`
  - `20251201170000_accounting_knowledge_base.sql`
  - `20251201180000_accounting_kb_comprehensive.sql`
  - `20251201210000_accounting_kb.sql`
  - `20251201_accounting_kb.sql`
  - `20251201_accounting_knowledge_base.sql`
  - `20260201150000_accounting_kb_comprehensive.sql`

#### `public.knowledge_events`
- **First Seen:** `20250923093000_agent_learning_tables.sql`
- **Defined In:** 1 file(s)

#### `public.knowledge_search_analytics`
- **First Seen:** `20250115000000_agent_knowledge_system.sql`
- **Defined In:** 1 file(s)

#### `public.knowledge_source_suggestions`
- **First Seen:** `20260201180000_agent_feedback_loop.sql`
- **Defined In:** 1 file(s)

#### `public.knowledge_source_templates`
- **First Seen:** `20250115000000_agent_knowledge_system.sql`
- **Defined In:** 1 file(s)

#### `public.knowledge_sources`
- **First Seen:** `20250115000000_agent_knowledge_system.sql`
- **Defined In:** 10 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250115000000_agent_knowledge_system.sql`
  - `20250923093000_agent_learning_tables.sql`
  - `20251201000000_accounting_kb_comprehensive.sql`
  - `20251201170000_accounting_knowledge_base.sql`
  - `20251201180000_accounting_kb_comprehensive.sql`
  - `20251201210000_accounting_kb.sql`
  - `20251201_accounting_kb.sql`
  - `20251201_accounting_knowledge_base.sql`
  - `20260201000000_comprehensive_agent_portal.sql`
  - `20260201150000_accounting_kb_comprehensive.sql`
- **Dependencies:** public.knowledge_sources
- **Dependents:** public.knowledge_sources

#### `public.knowledge_sync_jobs`
- **First Seen:** `20250115000000_agent_knowledge_system.sql`
- **Defined In:** 1 file(s)

#### `public.knowledge_web_pages`
- **First Seen:** `20260201160000_rag_ingestion_pipeline.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.knowledge_web_pages
- **Dependents:** public.knowledge_web_pages

#### `public.knowledge_web_sources`
- **First Seen:** `20251201_knowledge_web_sources_200_urls.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.knowledge_web_sources
- **Dependents:** public.knowledge_web_sources

#### `public.learning_examples`
- **First Seen:** `20260128100000_agent_learning_system_comprehensive.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.learning_examples
- **Dependents:** public.learning_examples

#### `public.learning_experiments`
- **First Seen:** `20260128100000_agent_learning_system_comprehensive.sql`
- **Defined In:** 1 file(s)

#### `public.learning_metrics`
- **First Seen:** `20250927114500_learning_loop_tables.sql`
- **Defined In:** 1 file(s)

#### `public.learning_runs`
- **First Seen:** `20250923093000_agent_learning_tables.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.learning_runs
- **Dependents:** public.learning_runs

#### `public.learning_signals`
- **First Seen:** `20250927114500_learning_loop_tables.sql`
- **Defined In:** 1 file(s)

#### `public.ledger_accounts`
- **First Seen:** `20250924103000_accounting_close_gl.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.ledger_accounts
- **Dependents:** public.ledger_accounts

#### `public.ledger_entries`
- **First Seen:** `20250924103000_accounting_close_gl.sql`
- **Defined In:** 1 file(s)

#### `public.materiality_sets`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 5 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250901062854_.sql`
  - `20250901062855_139c4e89-6510-4395-988c-25ffdf993c21.sql`
  - `20250924095000_audit_plan_strategy_materiality.sql`

#### `public.members`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 3 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250830125756_a814a60a-2361-4a22-86ab-243f73b901ba.sql`
- **Dependencies:** public.memberships

#### `public.memberships`
- **First Seen:** `20250821115117_.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250821115117_.sql`
  - `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
- **Dependencies:** public.memberships
- **Dependents:** public.members, public.memberships

#### `public.misstatements`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`

#### `public.nid_computations`
- **First Seen:** `20250924141000_tax_mt_nid_patent_box.sql`
- **Defined In:** 1 file(s)

#### `public.notification_dispatch_queue`
- **First Seen:** `20251115090000_notification_fanout.sql`
- **Defined In:** 1 file(s)

#### `public.notifications`
- **First Seen:** `20250821115117_.sql`
- **Defined In:** 3 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250821115117_.sql`
  - `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
  - `20250926090000_tasks_documents_notifications.sql`

#### `public.nps_responses`
- **First Seen:** `20250930120000_nps_responses.sql`
- **Defined In:** 1 file(s)

#### `public.onboarding_checklist_items`
- **First Seen:** `20250926090000_tasks_documents_notifications.sql`
- **Defined In:** 1 file(s)

#### `public.onboarding_checklists`
- **First Seen:** `20250926090000_tasks_documents_notifications.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.onboarding_checklists
- **Dependents:** public.onboarding_checklists

#### `public.openai_debug_events`
- **First Seen:** `20251115100000_openai_debug_events.sql`
- **Defined In:** 1 file(s)

#### `public.organizations`
- **First Seen:** `001_initial_schema.sql`
- **Defined In:** 6 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `001_initial_schema.sql`
  - `20250821115117_.sql`
  - `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250830125756_a814a60a-2361-4a22-86ab-243f73b901ba.sql`
- **Dependencies:** public.organizations
- **Dependents:** public.organizations

#### `public.participation_exemptions`
- **First Seen:** `20250924100500_tax_mt_cit_imputation.sql`
- **Defined In:** 1 file(s)

#### `public.patent_box_computations`
- **First Seen:** `20250924141000_tax_mt_nid_patent_box.sql`
- **Defined In:** 1 file(s)

#### `public.pbc_items`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`

#### `public.pbc_requests`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
- **Dependencies:** public.pbc_requests
- **Dependents:** public.pbc_requests

#### `public.pillar_two_computations`
- **First Seen:** `20250924200000_tax_pillar_two_schema.sql`
- **Defined In:** 1 file(s)

#### `public.plan_change_log`
- **First Seen:** `20250924095000_audit_plan_strategy_materiality.sql`
- **Defined In:** 1 file(s)

#### `public.policies`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`

#### `public.portal_sessions`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`

#### `public.profiles`
- **First Seen:** `001_initial_schema.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.profiles
- **Dependents:** public.profiles

#### `public.query_hints`
- **First Seen:** `20250927114500_learning_loop_tables.sql`
- **Defined In:** 1 file(s)

#### `public.rag_search_optimizations`
- **First Seen:** `20260201180000_agent_feedback_loop.sql`
- **Defined In:** 1 file(s)

#### `public.rate_limits`
- **First Seen:** `20250924231000_rate_limits.sql`
- **Defined In:** 1 file(s)

#### `public.reconciliation_items`
- **First Seen:** `20250924103000_accounting_close_gl.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250924103000_accounting_close_gl.sql`
  - `20251111090000_audit_ctrl1_ada1_rec1.sql`

#### `public.reconciliations`
- **First Seen:** `20250924103000_accounting_close_gl.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250924103000_accounting_close_gl.sql`
  - `20251111090000_audit_ctrl1_ada1_rec1.sql`
- **Dependencies:** public.reconciliations
- **Dependents:** public.reconciliations

#### `public.retrieval_guardrails`
- **First Seen:** `20260201100000_curated_knowledge_base.sql`
- **Defined In:** 1 file(s)

#### `public.return_files`
- **First Seen:** `20250924100500_tax_mt_cit_imputation.sql`
- **Defined In:** 1 file(s)

#### `public.risks`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 4 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250901062854_.sql`
  - `20250901062855_139c4e89-6510-4395-988c-25ffdf993c21.sql`
- **Dependencies:** public.risks
- **Dependents:** public.risks

#### `public.samples`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`

#### `public.system_settings`
- **First Seen:** `20251115114000_system_settings.sql`
- **Defined In:** 1 file(s)

#### `public.task_attachments`
- **First Seen:** `20250926090000_tasks_documents_notifications.sql`
- **Defined In:** 1 file(s)

#### `public.task_comments`
- **First Seen:** `20250926090000_tasks_documents_notifications.sql`
- **Defined In:** 1 file(s)

#### `public.tasks`
- **First Seen:** `20250821115117_.sql`
- **Defined In:** 3 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250821115117_.sql`
  - `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
  - `20250926090000_tasks_documents_notifications.sql`
- **Dependencies:** public.tasks
- **Dependents:** public.tasks

#### `public.tax`
- **First Seen:** `20250921090001_backfill_core_tables.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.tax_dispute_cases, public.tax_entities

#### `public.tax_accounts`
- **First Seen:** `20250924100500_tax_mt_cit_imputation.sql`
- **Defined In:** 1 file(s)

#### `public.tax_dispute_cases`
- **First Seen:** `20250924210000_tax_treaty_wht.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.tax_dispute_cases
- **Dependents:** public.tax, public.tax_dispute_cases

#### `public.tax_dispute_events`
- **First Seen:** `20250924210000_tax_treaty_wht.sql`
- **Defined In:** 1 file(s)

#### `public.tax_entities`
- **First Seen:** `20250924100500_tax_mt_cit_imputation.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.tax_entities
- **Dependents:** public.tax, public.tax_entities

#### `public.tax_entity_relationships`
- **First Seen:** `20250924200000_tax_pillar_two_schema.sql`
- **Defined In:** 1 file(s)

#### `public.telemetry_coverage_metrics`
- **First Seen:** `20250924113000_telemetry_schema.sql`
- **Defined In:** 1 file(s)

#### `public.telemetry_refusal_events`
- **First Seen:** `20250924113000_telemetry_schema.sql`
- **Defined In:** 1 file(s)

#### `public.telemetry_service_levels`
- **First Seen:** `20250924113000_telemetry_schema.sql`
- **Defined In:** 1 file(s)

#### `public.tests`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
- **Dependencies:** public.tests
- **Dependents:** public.tests

#### `public.tool_registry`
- **First Seen:** `20251115093000_agent_hitl_extensions.sql`
- **Defined In:** 1 file(s)

#### `public.training_datasets`
- **First Seen:** `20260128100000_agent_learning_system_comprehensive.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.training_datasets
- **Dependents:** public.training_datasets

#### `public.training_runs`
- **First Seen:** `20260128100000_agent_learning_system_comprehensive.sql`
- **Defined In:** 1 file(s)

#### `public.transactions`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 5 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250829090000_5ea29147-38dc-4b92-9f17-7dc59a6c4647.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250901062854_.sql`
  - `20250901062855_139c4e89-6510-4395-988c-25ffdf993c21.sql`

#### `public.treaty_wht_calculations`
- **First Seen:** `20250924210000_tax_treaty_wht.sql`
- **Defined In:** 1 file(s)

#### `public.trial_balance_snapshots`
- **First Seen:** `20250924103000_accounting_close_gl.sql`
- **Defined In:** 1 file(s)

#### `public.us_tax_overlay_calculations`
- **First Seen:** `20250924213000_tax_us_overlays.sql`
- **Defined In:** 1 file(s)

#### `public.user_invitations`
- **First Seen:** `20260103010000_user_management_roles.sql`
- **Defined In:** 1 file(s)

#### `public.user_notification_preferences`
- **First Seen:** `20251115090000_notification_fanout.sql`
- **Defined In:** 1 file(s)

#### `public.user_profiles`
- **First Seen:** `20260103010000_user_management_roles.sql`
- **Defined In:** 1 file(s)

#### `public.users`
- **First Seen:** `20250821115117_.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250821115117_.sql`
  - `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
- **Dependencies:** public.users
- **Dependents:** public.users

#### `public.variance_results`
- **First Seen:** `20250924103000_accounting_close_gl.sql`
- **Defined In:** 1 file(s)

#### `public.variance_rules`
- **First Seen:** `20250924103000_accounting_close_gl.sql`
- **Defined In:** 1 file(s)
- **Dependencies:** public.variance_rules
- **Dependents:** public.variance_rules

#### `public.vat_filings`
- **First Seen:** `20250924173000_tax_vat_returns.sql`
- **Defined In:** 1 file(s)

#### `public.vat_returns`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`

#### `public.vat_rules`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 4 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250901062854_.sql`
  - `20250901062855_139c4e89-6510-4395-988c-25ffdf993c21.sql`

#### `public.vendor_category_mappings`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 4 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250901062854_.sql`
  - `20250901062855_139c4e89-6510-4395-988c-25ffdf993c21.sql`

#### `public.vendors`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 4 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250901062854_.sql`
  - `20250901062855_139c4e89-6510-4395-988c-25ffdf993c21.sql`
- **Dependencies:** public.vendors
- **Dependents:** public.vendors

#### `public.vies_checks`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`

#### `public.web_fetch_cache`
- **First Seen:** `20251115122000_web_fetch_cache.sql`
- **Defined In:** 1 file(s)

#### `public.web_knowledge_sources`
- **First Seen:** `20250923095000_web_knowledge_sources.sql`
- **Defined In:** 1 file(s)

#### `public.workpapers`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
- **Dependencies:** public.workpapers
- **Dependents:** public.workpapers

## Function Analysis


### All Functions (68 total)


#### `app.activity_log_enrich`
- **First Seen:** `20250924112000_activity_log_enrichment.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250924112000_activity_log_enrichment.sql`
  - `20251018101620_remote_schema.sql`

#### `app.create_api_key`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 4 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250924014606_remote_schema.sql`
  - `20251018101620_remote_schema.sql`

#### `app.current_user_id`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 8 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250830125648_f73e809f-f983-405f-9ed8-e17d84d48869.sql`
  - `20250830125703_5bf2f541-dcd5-4c5e-a182-de2328149a5f.sql`
  - `20250830125839_.sql`
  - `20250830125841_9195bd32-1de7-41d9-ac3c-d017d0dbe16a.sql`
  - `20250924014606_remote_schema.sql`
  - `20251018101620_remote_schema.sql`

#### `app.is_member_of`
- **First Seen:** `20250924141001_tax_mt_nid_patent_box_rls.sql`
- **Defined In:** 3 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250924141001_tax_mt_nid_patent_box_rls.sql`
  - `20250925220000_app_is_member_of_wrapper.sql`
  - `20251018101620_remote_schema.sql`

#### `app.is_org_admin`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 8 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250830125648_f73e809f-f983-405f-9ed8-e17d84d48869.sql`
  - `20250830125703_5bf2f541-dcd5-4c5e-a182-de2328149a5f.sql`
  - `20250830125839_.sql`
  - `20250830125841_9195bd32-1de7-41d9-ac3c-d017d0dbe16a.sql`
  - `20250924014606_remote_schema.sql`
  - `20251018101620_remote_schema.sql`

#### `app.is_org_member`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 8 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250830125648_f73e809f-f983-405f-9ed8-e17d84d48869.sql`
  - `20250830125703_5bf2f541-dcd5-4c5e-a182-de2328149a5f.sql`
  - `20250830125839_.sql`
  - `20250830125841_9195bd32-1de7-41d9-ac3c-d017d0dbe16a.sql`
  - `20250924014606_remote_schema.sql`
  - `20251018101620_remote_schema.sql`

#### `app.role_rank`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 8 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250830125648_f73e809f-f983-405f-9ed8-e17d84d48869.sql`
  - `20250830125703_5bf2f541-dcd5-4c5e-a182-de2328149a5f.sql`
  - `20250830125839_.sql`
  - `20250830125841_9195bd32-1de7-41d9-ac3c-d017d0dbe16a.sql`
  - `20250924014606_remote_schema.sql`
  - `20251018101620_remote_schema.sql`

#### `app.set_tenant`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 4 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250924014606_remote_schema.sql`
  - `20251018101620_remote_schema.sql`

#### `app.touch_updated_at`
- **First Seen:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Defined In:** 6 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250830125839_.sql`
  - `20250830125841_9195bd32-1de7-41d9-ac3c-d017d0dbe16a.sql`
  - `20250924014606_remote_schema.sql`
  - `20251018101620_remote_schema.sql`

#### `auth_cache.has_min_role_cached`
- **First Seen:** `20251128000000_comprehensive_rls_policies.sql`
- **Defined In:** 1 file(s)

#### `public.aggregate_agent_daily_stats`
- **First Seen:** `20260201170000_agent_analytics_schema.sql`
- **Defined In:** 1 file(s)

#### `public.apply_learning_event`
- **First Seen:** `20260201180000_agent_feedback_loop.sql`
- **Defined In:** 1 file(s)

#### `public.auto_generate_conversation_title`
- **First Seen:** `20241201_conversations_schema.sql`
- **Defined In:** 1 file(s)

#### `public.calculate_tax_liability`
- **First Seen:** `20251128000001_database_function_security_patch.sql`
- **Defined In:** 1 file(s)

#### `public.complete_agent_execution`
- **First Seen:** `20260201170000_agent_analytics_schema.sql`
- **Defined In:** 1 file(s)

#### `public.create_activity_event`
- **First Seen:** `20251128000001_database_function_security_patch.sql`
- **Defined In:** 1 file(s)

#### `public.create_learning_event`
- **First Seen:** `20260201180000_agent_feedback_loop.sql`
- **Defined In:** 1 file(s)

#### `public.current_user_id`
- **First Seen:** `20250103000000_core_functions_consolidation.sql`
- **Defined In:** 1 file(s)

#### `public.deep_search_knowledge`
- **First Seen:** `20260201160000_rag_ingestion_pipeline.sql`
- **Defined In:** 1 file(s)

#### `public.detect_knowledge_gaps`
- **First Seen:** `20260201180000_agent_feedback_loop.sql`
- **Defined In:** 1 file(s)

#### `public.enforce_rate_limit`
- **First Seen:** `20250924231000_rate_limits.sql`
- **Defined In:** 3 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250924231000_rate_limits.sql`
  - `20251004112226_e845fcd6-6600-469d-91ac-00f716b13d33.sql`
  - `20251018101620_remote_schema.sql`

#### `public.generate_audit_report`
- **First Seen:** `20251128000001_database_function_security_patch.sql`
- **Defined In:** 1 file(s)

#### `public.get_context_chunks`
- **First Seen:** `20251201000001_accounting_kb_functions.sql`
- **Defined In:** 1 file(s)

#### `public.get_document_context`
- **First Seen:** `20251201_accounting_kb_functions.sql`
- **Defined In:** 1 file(s)

#### `public.get_ingestion_stats`
- **First Seen:** `20251201000001_accounting_kb_functions.sql`
- **Defined In:** 1 file(s)

#### `public.get_learning_stats`
- **First Seen:** `20260128100000_agent_learning_system_comprehensive.sql`
- **Defined In:** 1 file(s)

#### `public.get_organization_members`
- **First Seen:** `20251128000001_database_function_security_patch.sql`
- **Defined In:** 1 file(s)

#### `public.get_user_organizations`
- **First Seen:** `20251128000001_database_function_security_patch.sql`
- **Defined In:** 1 file(s)

#### `public.get_user_role`
- **First Seen:** `20260103010000_user_management_roles.sql`
- **Defined In:** 1 file(s)

#### `public.handle_new_user`
- **First Seen:** `20250103000000_core_functions_consolidation.sql`
- **Defined In:** 11 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250103000000_core_functions_consolidation.sql`
  - `20250821115117_.sql`
  - `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
  - `20250821115348_878f265d-a747-47a8-aade-2f2d66847d8c.sql`
  - `20250821115406_.sql`
  - `20250821115407_50fe85e1-e606-4424-960d-acc41a893410.sql`
  - `20250924014606_remote_schema.sql`
  - `20251004112226_e845fcd6-6600-469d-91ac-00f716b13d33.sql`
  - `20251018101620_remote_schema.sql`
  - `20251128000001_database_function_security_patch.sql`
  - `20260103010000_user_management_roles.sql`

#### `public.handle_updated_at`
- **First Seen:** `20250821115117_.sql`
- **Defined In:** 9 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250821115117_.sql`
  - `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
  - `20250821115348_878f265d-a747-47a8-aade-2f2d66847d8c.sql`
  - `20250821115406_.sql`
  - `20250821115407_50fe85e1-e606-4424-960d-acc41a893410.sql`
  - `20250924014606_remote_schema.sql`
  - `20251004112226_e845fcd6-6600-469d-91ac-00f716b13d33.sql`
  - `20251018101620_remote_schema.sql`
  - `20251128000001_database_function_security_patch.sql`

#### `public.has_min_role`
- **First Seen:** `20250103000000_core_functions_consolidation.sql`
- **Defined In:** 14 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250103000000_core_functions_consolidation.sql`
  - `20250103000000_core_functions_consolidation.sql`
  - `20250821115117_.sql`
  - `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
  - `20250821115348_878f265d-a747-47a8-aade-2f2d66847d8c.sql`
  - `20250821115406_.sql`
  - `20250821115407_50fe85e1-e606-4424-960d-acc41a893410.sql`
  - `20250924014606_remote_schema.sql`
  - `20251004112226_e845fcd6-6600-469d-91ac-00f716b13d33.sql`
  - `20251005104500_phase_a_foundation.sql`
  - `20251005104500_phase_a_foundation.sql`
  - `20251018101620_remote_schema.sql`
  - `20251018101620_remote_schema.sql`
  - `20251128000001_database_function_security_patch.sql`

#### `public.hybrid_search_chunks`
- **First Seen:** `20250115000000_agent_knowledge_system.sql`
- **Defined In:** 1 file(s)

#### `public.is_member_of`
- **First Seen:** `20250103000000_core_functions_consolidation.sql`
- **Defined In:** 10 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250103000000_core_functions_consolidation.sql`
  - `20250821115117_.sql`
  - `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
  - `20250821115348_878f265d-a747-47a8-aade-2f2d66847d8c.sql`
  - `20250821115406_.sql`
  - `20250821115407_50fe85e1-e606-4424-960d-acc41a893410.sql`
  - `20250924014606_remote_schema.sql`
  - `20251004112226_e845fcd6-6600-469d-91ac-00f716b13d33.sql`
  - `20251018101620_remote_schema.sql`
  - `20251128000001_database_function_security_patch.sql`

#### `public.is_system_admin`
- **First Seen:** `20260103010000_user_management_roles.sql`
- **Defined In:** 1 file(s)

#### `public.kb_can_access_confidentiality`
- **First Seen:** `20260103000000_kb_comprehensive_schema.sql`
- **Defined In:** 1 file(s)

#### `public.kb_search`
- **First Seen:** `20260103000000_kb_comprehensive_schema.sql`
- **Defined In:** 1 file(s)

#### `public.keyword_search_chunks`
- **First Seen:** `20251201180000_accounting_kb_comprehensive.sql`
- **Defined In:** 1 file(s)

#### `public.log_agent_execution`
- **First Seen:** `20260201170000_agent_analytics_schema.sql`
- **Defined In:** 1 file(s)

#### `public.log_agent_query`
- **First Seen:** `20251201000001_accounting_kb_functions.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20251201000001_accounting_kb_functions.sql`
  - `20251201_accounting_kb_functions.sql`

#### `public.log_reasoning_trace`
- **First Seen:** `20260201100000_curated_knowledge_base.sql`
- **Defined In:** 1 file(s)

#### `public.match_kb_documents`
- **First Seen:** `20241201120000_kb_documents_schema.sql`
- **Defined In:** 1 file(s)

#### `public.match_knowledge_chunks`
- **First Seen:** `20251201000001_accounting_kb_functions.sql`
- **Defined In:** 3 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20251201000001_accounting_kb_functions.sql`
  - `20251201213700_match_knowledge_chunks_rpc.sql`
  - `20251201_accounting_kb_functions.sql`

#### `public.match_vectors`
- **First Seen:** `001_initial_schema.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `001_initial_schema.sql`
  - `20251128000001_database_function_security_patch.sql`

#### `public.optimize_rag_parameters`
- **First Seen:** `20260201180000_agent_feedback_loop.sql`
- **Defined In:** 1 file(s)

#### `public.refresh_agent_performance_metrics`
- **First Seen:** `20260201170000_agent_analytics_schema.sql`
- **Defined In:** 1 file(s)

#### `public.search_curated_knowledge`
- **First Seen:** `20260201100000_curated_knowledge_base.sql`
- **Defined In:** 1 file(s)

#### `public.search_knowledge_chunks`
- **First Seen:** `20251201180000_accounting_kb_comprehensive.sql`
- **Defined In:** 1 file(s)

#### `public.search_knowledge_chunks_keyword`
- **First Seen:** `20251201000001_accounting_kb_functions.sql`
- **Defined In:** 1 file(s)

#### `public.search_knowledge_semantic`
- **First Seen:** `20251201170000_accounting_knowledge_base.sql`
- **Defined In:** 1 file(s)

#### `public.semantic_search_chunks`
- **First Seen:** `20250115000000_agent_knowledge_system.sql`
- **Defined In:** 1 file(s)

#### `public.set_notification_dispatch_queue_updated_at`
- **First Seen:** `20251115090000_notification_fanout.sql`
- **Defined In:** 1 file(s)

#### `public.set_user_notification_preferences_updated_at`
- **First Seen:** `20251115090000_notification_fanout.sql`
- **Defined In:** 1 file(s)

#### `public.should_trigger_deep_search`
- **First Seen:** `20260201100000_curated_knowledge_base.sql`
- **Defined In:** 1 file(s)

#### `public.soft_delete_record`
- **First Seen:** `20251128000001_database_function_security_patch.sql`
- **Defined In:** 1 file(s)

#### `public.suggest_classification_improvements`
- **First Seen:** `20260201180000_agent_feedback_loop.sql`
- **Defined In:** 1 file(s)

#### `public.touch_updated_at`
- **First Seen:** `20250103000000_core_functions_consolidation.sql`
- **Defined In:** 1 file(s)

#### `public.trigger_update_dataset_stats`
- **First Seen:** `20260128100000_agent_learning_system_comprehensive.sql`
- **Defined In:** 1 file(s)

#### `public.update_ckb_updated_at`
- **First Seen:** `20260201100000_curated_knowledge_base.sql`
- **Defined In:** 1 file(s)

#### `public.update_ckb_usage`
- **First Seen:** `20260201100000_curated_knowledge_base.sql`
- **Defined In:** 1 file(s)

#### `public.update_conversation_on_message`
- **First Seen:** `20241201_conversations_schema.sql`
- **Defined In:** 1 file(s)

#### `public.update_dataset_stats`
- **First Seen:** `20260128100000_agent_learning_system_comprehensive.sql`
- **Defined In:** 1 file(s)

#### `public.update_kb_documents_updated_at`
- **First Seen:** `20241201120000_kb_documents_schema.sql`
- **Defined In:** 1 file(s)

#### `public.update_knowledge_source_stats`
- **First Seen:** `20250115000000_agent_knowledge_system.sql`
- **Defined In:** 1 file(s)

#### `public.update_knowledge_sources_updated_at`
- **First Seen:** `20250115000000_agent_knowledge_system.sql`
- **Defined In:** 1 file(s)

#### `public.update_last_login`
- **First Seen:** `20260103010000_user_management_roles.sql`
- **Defined In:** 1 file(s)

#### `public.update_updated_at`
- **First Seen:** `001_initial_schema.sql`
- **Defined In:** 1 file(s)

#### `public.update_updated_at_column`
- **First Seen:** `20251202000307_agent_production_system.sql`
- **Defined In:** 2 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20251202000307_agent_production_system.sql`
  - `20260201000000_comprehensive_agent_portal.sql`

## Enum Analysis


### All Enums (61 total)


#### `public.acceptance_decision`
- **First Seen:** `20251113093000_audit_acceptance_foundation.sql`
- **Defined In:** 1 file(s)

#### `public.acceptance_status`
- **First Seen:** `20251113093000_audit_acceptance_foundation.sql`
- **Defined In:** 1 file(s)

#### `public.ada_exception_disposition`
- **First Seen:** `20251111090000_audit_ctrl1_ada1_rec1.sql`
- **Defined In:** 1 file(s)

#### `public.ada_run_kind`
- **First Seen:** `20251111090000_audit_ctrl1_ada1_rec1.sql`
- **Defined In:** 1 file(s)

#### `public.agent_action_status`
- **First Seen:** `20251115093000_agent_hitl_extensions.sql`
- **Defined In:** 1 file(s)

#### `public.agent_orchestration_status`
- **First Seen:** `20251115110000_agent_mcp_schema.sql`
- **Defined In:** 1 file(s)

#### `public.agent_run_state`
- **First Seen:** `20251115093000_agent_hitl_extensions.sql`
- **Defined In:** 1 file(s)

#### `public.agent_task_status`
- **First Seen:** `20251115110000_agent_mcp_schema.sql`
- **Defined In:** 1 file(s)

#### `public.agent_trace_type`
- **First Seen:** `20251115093000_agent_hitl_extensions.sql`
- **Defined In:** 1 file(s)

#### `public.app_role`
- **First Seen:** `20260103010000_user_management_roles.sql`
- **Defined In:** 1 file(s)

#### `public.approval_stage`
- **First Seen:** `20251113093000_audit_acceptance_foundation.sql`
- **Defined In:** 1 file(s)

#### `public.approval_status`
- **First Seen:** `20251113093000_audit_acceptance_foundation.sql`
- **Defined In:** 1 file(s)

#### `public.audit_risk_category`
- **First Seen:** `20250924120000_audit_risk_register.sql`
- **Defined In:** 1 file(s)

#### `public.autonomy_level`
- **First Seen:** `20251005104500_phase_a_foundation.sql`
- **Defined In:** 1 file(s)

#### `public.background_risk_rating`
- **First Seen:** `20251113093000_audit_acceptance_foundation.sql`
- **Defined In:** 1 file(s)

#### `public.cit_refund_profile`
- **First Seen:** `20250924100500_tax_mt_cit_imputation.sql`
- **Defined In:** 1 file(s)

#### `public.close_period_status`
- **First Seen:** `20250924103000_accounting_close_gl.sql`
- **Defined In:** 1 file(s)

#### `public.control_frequency`
- **First Seen:** `20251111090000_audit_ctrl1_ada1_rec1.sql`
- **Defined In:** 1 file(s)

#### `public.control_test_result`
- **First Seen:** `20251111090000_audit_ctrl1_ada1_rec1.sql`
- **Defined In:** 1 file(s)

#### `public.control_walkthrough_result`
- **First Seen:** `20251111090000_audit_ctrl1_ada1_rec1.sql`
- **Defined In:** 1 file(s)

#### `public.dac6_hallmark_category`
- **First Seen:** `20250924182000_tax_dac6_schema.sql`
- **Defined In:** 1 file(s)

#### `public.dac6_submission_status`
- **First Seen:** `20250924182000_tax_dac6_schema.sql`
- **Defined In:** 1 file(s)

#### `public.deficiency_severity`
- **First Seen:** `20251111090000_audit_ctrl1_ada1_rec1.sql`
- **Defined In:** 1 file(s)

#### `public.deficiency_status`
- **First Seen:** `20251111090000_audit_ctrl1_ada1_rec1.sql`
- **Defined In:** 1 file(s)

#### `public.denylist_action`
- **First Seen:** `20250927114500_learning_loop_tables.sql`
- **Defined In:** 1 file(s)

#### `public.engagement_status`
- **First Seen:** `20250103000001_enums_consolidation.sql`
- **Defined In:** 7 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250103000001_enums_consolidation.sql`
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250830125719_.sql`
  - `20250830125720_1b779663-4991-4f79-83e6-f963458284ae.sql`
  - `20250830125735_.sql`
  - `20250830125736_e118852a-6ecd-46c6-9c5d-53935d524f61.sql`

#### `public.estimate_uncertainty_level`
- **First Seen:** `20250924135000_audit_kam_schema.sql`
- **Defined In:** 1 file(s)

#### `public.fraud_plan_status`
- **First Seen:** `20250924130000_fraud_plan_je_strategy.sql`
- **Defined In:** 1 file(s)

#### `public.going_concern_assessment`
- **First Seen:** `20250924135000_audit_kam_schema.sql`
- **Defined In:** 1 file(s)

#### `public.independence_conclusion`
- **First Seen:** `20251113093000_audit_acceptance_foundation.sql`
- **Defined In:** 1 file(s)

#### `public.itgc_group_type`
- **First Seen:** `20251111090000_audit_ctrl1_ada1_rec1.sql`
- **Defined In:** 1 file(s)

#### `public.je_control_rule`
- **First Seen:** `20250924103000_accounting_close_gl.sql`
- **Defined In:** 1 file(s)

#### `public.je_control_severity`
- **First Seen:** `20250924103000_accounting_close_gl.sql`
- **Defined In:** 1 file(s)

#### `public.kam_candidate_source`
- **First Seen:** `20250924135000_audit_kam_schema.sql`
- **Defined In:** 1 file(s)

#### `public.kam_candidate_status`
- **First Seen:** `20250924135000_audit_kam_schema.sql`
- **Defined In:** 1 file(s)

#### `public.kam_draft_status`
- **First Seen:** `20250924135000_audit_kam_schema.sql`
- **Defined In:** 1 file(s)

#### `public.kb_confidentiality`
- **First Seen:** `20260103000000_kb_comprehensive_schema.sql`
- **Defined In:** 1 file(s)

#### `public.kb_doc_type`
- **First Seen:** `20260103000000_kb_comprehensive_schema.sql`
- **Defined In:** 1 file(s)

#### `public.kb_document_status`
- **First Seen:** `20260103000000_kb_comprehensive_schema.sql`
- **Defined In:** 1 file(s)

#### `public.kb_run_status`
- **First Seen:** `20260103000000_kb_comprehensive_schema.sql`
- **Defined In:** 1 file(s)

#### `public.kb_standard`
- **First Seen:** `20260103000000_kb_comprehensive_schema.sql`
- **Defined In:** 1 file(s)

#### `public.knowledge_source_priority`
- **First Seen:** `20260201100000_curated_knowledge_base.sql`
- **Defined In:** 1 file(s)

#### `public.knowledge_standard_type`
- **First Seen:** `20260201100000_curated_knowledge_base.sql`
- **Defined In:** 1 file(s)

#### `public.knowledge_verification_level`
- **First Seen:** `20260201100000_curated_knowledge_base.sql`
- **Defined In:** 1 file(s)

#### `public.learning_job_kind`
- **First Seen:** `20250927114500_learning_loop_tables.sql`
- **Defined In:** 1 file(s)

#### `public.learning_job_status`
- **First Seen:** `20250927114500_learning_loop_tables.sql`
- **Defined In:** 1 file(s)

#### `public.ledger_account_type`
- **First Seen:** `20250924103000_accounting_close_gl.sql`
- **Defined In:** 1 file(s)

#### `public.org_role`
- **First Seen:** `20250103000001_enums_consolidation.sql`
- **Defined In:** 7 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250103000001_enums_consolidation.sql`
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250830125719_.sql`
  - `20250830125720_1b779663-4991-4f79-83e6-f963458284ae.sql`
  - `20250830125735_.sql`
  - `20250830125736_e118852a-6ecd-46c6-9c5d-53935d524f61.sql`

#### `public.reconciliation_item_category`
- **First Seen:** `20250103000001_enums_consolidation.sql`
- **Defined In:** 3 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250103000001_enums_consolidation.sql`
  - `20250924103000_accounting_close_gl.sql`
  - `20251111090000_audit_ctrl1_ada1_rec1.sql`

#### `public.reconciliation_status`
- **First Seen:** `20251111090000_audit_ctrl1_ada1_rec1.sql`
- **Defined In:** 1 file(s)

#### `public.reconciliation_type`
- **First Seen:** `20250103000001_enums_consolidation.sql`
- **Defined In:** 3 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250103000001_enums_consolidation.sql`
  - `20250924103000_accounting_close_gl.sql`
  - `20251111090000_audit_ctrl1_ada1_rec1.sql`

#### `public.response_status`
- **First Seen:** `20250924124000_audit_responses_matrix.sql`
- **Defined In:** 1 file(s)

#### `public.response_type`
- **First Seen:** `20250924124000_audit_responses_matrix.sql`
- **Defined In:** 1 file(s)

#### `public.risk_rating`
- **First Seen:** `20250924120000_audit_risk_register.sql`
- **Defined In:** 1 file(s)

#### `public.risk_status`
- **First Seen:** `20250924120000_audit_risk_register.sql`
- **Defined In:** 1 file(s)

#### `public.role_level`
- **First Seen:** `20250103000001_enums_consolidation.sql`
- **Defined In:** 3 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250103000001_enums_consolidation.sql`
  - `20250821115117_.sql`
  - `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`

#### `public.severity_level`
- **First Seen:** `20250103000001_enums_consolidation.sql`
- **Defined In:** 7 file(s)
- **⚠️ DUPLICATE** - Defined in multiple files:
  - `20250103000001_enums_consolidation.sql`
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250830125719_.sql`
  - `20250830125720_1b779663-4991-4f79-83e6-f963458284ae.sql`
  - `20250830125735_.sql`
  - `20250830125736_e118852a-6ecd-46c6-9c5d-53935d524f61.sql`

#### `public.tax_account_type`
- **First Seen:** `20250924100500_tax_mt_cit_imputation.sql`
- **Defined In:** 1 file(s)

#### `public.tax_dispute_status`
- **First Seen:** `20250924210000_tax_treaty_wht.sql`
- **Defined In:** 1 file(s)

#### `public.us_overlay_type`
- **First Seen:** `20250924213000_tax_us_overlays.sql`
- **Defined In:** 1 file(s)

#### `public.user_status`
- **First Seen:** `20260103010000_user_management_roles.sql`
- **Defined In:** 1 file(s)

## Dependency Graph


### Tables with Dependencies


- `public.ada_runs` depends on:
  - `public.ada_runs`

- `public.agent_actions` depends on:
  - `public.agent_actions`

- `public.agent_conversations` depends on:
  - `public.agent_conversations`

- `public.agent_execution_logs` depends on:
  - `public.agent_execution_logs`

- `public.agent_executions` depends on:
  - `public.agent_executions`

- `public.agent_guardrails` depends on:
  - `public.agent_guardrails`

- `public.agent_knowledge_sources` depends on:
  - `public.agent_knowledge_sources`

- `public.agent_learning_events` depends on:
  - `public.agent_learning_events`

- `public.agent_manifests` depends on:
  - `public.agent_manifests`

- `public.agent_orchestration_sessions` depends on:
  - `public.agent_orchestration_sessions`

- `public.agent_orchestration_tasks` depends on:
  - `public.agent_orchestration_tasks`

- `public.agent_personas` depends on:
  - `public.agent_personas`

- `public.agent_policy_versions` depends on:
  - `public.agent_policy_versions`

- `public.agent_runs` depends on:
  - `public.agent_runs`

- `public.agent_sessions` depends on:
  - `public.agent_sessions`

- `public.agent_tools` depends on:
  - `public.agent_tools`

- `public.agents` depends on:
  - `public.agents`

- `public.app_users` depends on:
  - `public.app_users`

- `public.audit` depends on:
  - `public.audit_planned_procedures`
  - `public.audit_plans`
  - `public.audit_responses`
  - `public.audit_risks`

- `public.audit_planned_procedures` depends on:
  - `public.audit_planned_procedures`

- `public.audit_plans` depends on:
  - `public.audit_plans`

- `public.audit_responses` depends on:
  - `public.audit_responses`

- `public.audit_risks` depends on:
  - `public.audit_risks`

- `public.categories` depends on:
  - `public.categories`

- `public.chart_of_accounts` depends on:
  - `public.chart_of_accounts`

- `public.chat_sessions` depends on:
  - `public.chat_sessions`

- `public.chatkit_sessions` depends on:
  - `public.chatkit_sessions`

- `public.clients` depends on:
  - `public.clients`

- `public.close_periods` depends on:
  - `public.close_periods`

- `public.controls` depends on:
  - `public.controls`

- `public.conversations` depends on:
  - `public.conversations`

- `public.curated_knowledge_base` depends on:
  - `public.curated_knowledge_base`

- `public.dac6_arrangements` depends on:
  - `public.dac6_arrangements`

- `public.documents` depends on:
  - `public.documents`

- `public.engagements` depends on:
  - `public.engagements`

- `public.entities` depends on:
  - `public.entities`

- `public.estimate_register` depends on:
  - `public.estimate_register`

- `public.fraud_plans` depends on:
  - `public.fraud_plans`

- `public.fs_lines` depends on:
  - `public.fs_lines`

- `public.gdrive_connectors` depends on:
  - `public.gdrive_connectors`

- `public.going_concern_worksheets` depends on:
  - `public.going_concern_worksheets`

- `public.ingestion_jobs` depends on:
  - `public.ingestion_jobs`

- `public.journal_batches` depends on:
  - `public.journal_batches`

- `public.journal_entries` depends on:
  - `public.journal_entries`

- `public.jurisdictions` depends on:
  - `public.jurisdictions`

- `public.kam_candidates` depends on:
  - `public.kam_candidates`

- `public.kam_drafts` depends on:
  - `public.kam_drafts`

- `public.kb_chunks` depends on:
  - `public.kb_chunks`

- `public.kb_documents` depends on:
  - `public.kb_documents`

- `public.kb_sources` depends on:
  - `public.kb_sources`

- `public.knowledge_chunks` depends on:
  - `public.knowledge_chunks`

- `public.knowledge_corpora` depends on:
  - `public.knowledge_corpora`

- `public.knowledge_documents` depends on:
  - `public.knowledge_documents`

- `public.knowledge_sources` depends on:
  - `public.knowledge_sources`

- `public.knowledge_web_pages` depends on:
  - `public.knowledge_web_pages`

- `public.knowledge_web_sources` depends on:
  - `public.knowledge_web_sources`

- `public.learning_examples` depends on:
  - `public.learning_examples`

- `public.learning_runs` depends on:
  - `public.learning_runs`

- `public.ledger_accounts` depends on:
  - `public.ledger_accounts`

- `public.members` depends on:
  - `public.memberships`

- `public.memberships` depends on:
  - `public.memberships`

- `public.onboarding_checklists` depends on:
  - `public.onboarding_checklists`

- `public.organizations` depends on:
  - `public.organizations`

- `public.pbc_requests` depends on:
  - `public.pbc_requests`

- `public.profiles` depends on:
  - `public.profiles`

- `public.reconciliations` depends on:
  - `public.reconciliations`

- `public.risks` depends on:
  - `public.risks`

- `public.tasks` depends on:
  - `public.tasks`

- `public.tax` depends on:
  - `public.tax_dispute_cases`
  - `public.tax_entities`

- `public.tax_dispute_cases` depends on:
  - `public.tax_dispute_cases`

- `public.tax_entities` depends on:
  - `public.tax_entities`

- `public.tests` depends on:
  - `public.tests`

- `public.training_datasets` depends on:
  - `public.training_datasets`

- `public.users` depends on:
  - `public.users`

- `public.variance_rules` depends on:
  - `public.variance_rules`

- `public.vendors` depends on:
  - `public.vendors`

- `public.workpapers` depends on:
  - `public.workpapers`

### Tables with Dependents


- `public.ada_runs` is referenced by:
  - `public.ada_runs`

- `public.agent_actions` is referenced by:
  - `public.agent_actions`

- `public.agent_conversations` is referenced by:
  - `public.agent_conversations`

- `public.agent_execution_logs` is referenced by:
  - `public.agent_execution_logs`

- `public.agent_executions` is referenced by:
  - `public.agent_executions`

- `public.agent_guardrails` is referenced by:
  - `public.agent_guardrails`

- `public.agent_knowledge_sources` is referenced by:
  - `public.agent_knowledge_sources`

- `public.agent_learning_events` is referenced by:
  - `public.agent_learning_events`

- `public.agent_manifests` is referenced by:
  - `public.agent_manifests`

- `public.agent_orchestration_sessions` is referenced by:
  - `public.agent_orchestration_sessions`

- `public.agent_orchestration_tasks` is referenced by:
  - `public.agent_orchestration_tasks`

- `public.agent_personas` is referenced by:
  - `public.agent_personas`

- `public.agent_policy_versions` is referenced by:
  - `public.agent_policy_versions`

- `public.agent_runs` is referenced by:
  - `public.agent_runs`

- `public.agent_sessions` is referenced by:
  - `public.agent_sessions`

- `public.agent_tools` is referenced by:
  - `public.agent_tools`

- `public.agents` is referenced by:
  - `public.agents`

- `public.app_users` is referenced by:
  - `public.app_users`

- `public.audit_planned_procedures` is referenced by:
  - `public.audit`
  - `public.audit_planned_procedures`

- `public.audit_plans` is referenced by:
  - `public.audit`
  - `public.audit_plans`

- `public.audit_responses` is referenced by:
  - `public.audit`
  - `public.audit_responses`

- `public.audit_risks` is referenced by:
  - `public.audit`
  - `public.audit_risks`

- `public.categories` is referenced by:
  - `public.categories`

- `public.chart_of_accounts` is referenced by:
  - `public.chart_of_accounts`

- `public.chat_sessions` is referenced by:
  - `public.chat_sessions`

- `public.chatkit_sessions` is referenced by:
  - `public.chatkit_sessions`

- `public.clients` is referenced by:
  - `public.clients`

- `public.close_periods` is referenced by:
  - `public.close_periods`

- `public.controls` is referenced by:
  - `public.controls`

- `public.conversations` is referenced by:
  - `public.conversations`

- `public.curated_knowledge_base` is referenced by:
  - `public.curated_knowledge_base`

- `public.dac6_arrangements` is referenced by:
  - `public.dac6_arrangements`

- `public.documents` is referenced by:
  - `public.documents`

- `public.engagements` is referenced by:
  - `public.engagements`

- `public.entities` is referenced by:
  - `public.entities`

- `public.estimate_register` is referenced by:
  - `public.estimate_register`

- `public.fraud_plans` is referenced by:
  - `public.fraud_plans`

- `public.fs_lines` is referenced by:
  - `public.fs_lines`

- `public.gdrive_connectors` is referenced by:
  - `public.gdrive_connectors`

- `public.going_concern_worksheets` is referenced by:
  - `public.going_concern_worksheets`

- `public.ingestion_jobs` is referenced by:
  - `public.ingestion_jobs`

- `public.journal_batches` is referenced by:
  - `public.journal_batches`

- `public.journal_entries` is referenced by:
  - `public.journal_entries`

- `public.jurisdictions` is referenced by:
  - `public.jurisdictions`

- `public.kam_candidates` is referenced by:
  - `public.kam_candidates`

- `public.kam_drafts` is referenced by:
  - `public.kam_drafts`

- `public.kb_chunks` is referenced by:
  - `public.kb_chunks`

- `public.kb_documents` is referenced by:
  - `public.kb_documents`

- `public.kb_sources` is referenced by:
  - `public.kb_sources`

- `public.knowledge_chunks` is referenced by:
  - `public.knowledge_chunks`

- `public.knowledge_corpora` is referenced by:
  - `public.knowledge_corpora`

- `public.knowledge_documents` is referenced by:
  - `public.knowledge_documents`

- `public.knowledge_sources` is referenced by:
  - `public.knowledge_sources`

- `public.knowledge_web_pages` is referenced by:
  - `public.knowledge_web_pages`

- `public.knowledge_web_sources` is referenced by:
  - `public.knowledge_web_sources`

- `public.learning_examples` is referenced by:
  - `public.learning_examples`

- `public.learning_runs` is referenced by:
  - `public.learning_runs`

- `public.ledger_accounts` is referenced by:
  - `public.ledger_accounts`

- `public.memberships` is referenced by:
  - `public.members`
  - `public.memberships`

- `public.onboarding_checklists` is referenced by:
  - `public.onboarding_checklists`

- `public.organizations` is referenced by:
  - `public.organizations`

- `public.pbc_requests` is referenced by:
  - `public.pbc_requests`

- `public.profiles` is referenced by:
  - `public.profiles`

- `public.reconciliations` is referenced by:
  - `public.reconciliations`

- `public.risks` is referenced by:
  - `public.risks`

- `public.tasks` is referenced by:
  - `public.tasks`

- `public.tax_dispute_cases` is referenced by:
  - `public.tax`
  - `public.tax_dispute_cases`

- `public.tax_entities` is referenced by:
  - `public.tax`
  - `public.tax_entities`

- `public.tests` is referenced by:
  - `public.tests`

- `public.training_datasets` is referenced by:
  - `public.training_datasets`

- `public.users` is referenced by:
  - `public.users`

- `public.variance_rules` is referenced by:
  - `public.variance_rules`

- `public.vendors` is referenced by:
  - `public.vendors`

- `public.workpapers` is referenced by:
  - `public.workpapers`

## Cleanup Recommendations


### Safe to Remove (After Consolidation Migrations Applied)


These duplicate definitions can be removed from older migrations
once the consolidation migrations (20250103000000, 20250103000001) are applied.


#### Functions (Use 20250103000000_core_functions_consolidation.sql instead)


- `app.activity_log_enrich` - Remove from 2 file(s):
  - `20250924112000_activity_log_enrichment.sql`
  - `20251018101620_remote_schema.sql`

- `app.create_api_key` - Remove from 4 file(s):
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250924014606_remote_schema.sql`
  - `20251018101620_remote_schema.sql`

- `app.current_user_id` - Remove from 8 file(s):
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250830125648_f73e809f-f983-405f-9ed8-e17d84d48869.sql`
  - `20250830125703_5bf2f541-dcd5-4c5e-a182-de2328149a5f.sql`
  - `20250830125839_.sql`
  - `20250830125841_9195bd32-1de7-41d9-ac3c-d017d0dbe16a.sql`
  - `20250924014606_remote_schema.sql`
  - `20251018101620_remote_schema.sql`

- `app.is_member_of` - Remove from 3 file(s):
  - `20250924141001_tax_mt_nid_patent_box_rls.sql`
  - `20250925220000_app_is_member_of_wrapper.sql`
  - `20251018101620_remote_schema.sql`

- `app.is_org_admin` - Remove from 8 file(s):
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250830125648_f73e809f-f983-405f-9ed8-e17d84d48869.sql`
  - `20250830125703_5bf2f541-dcd5-4c5e-a182-de2328149a5f.sql`
  - `20250830125839_.sql`
  - `20250830125841_9195bd32-1de7-41d9-ac3c-d017d0dbe16a.sql`
  - `20250924014606_remote_schema.sql`
  - `20251018101620_remote_schema.sql`

- `app.is_org_member` - Remove from 8 file(s):
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250830125648_f73e809f-f983-405f-9ed8-e17d84d48869.sql`
  - `20250830125703_5bf2f541-dcd5-4c5e-a182-de2328149a5f.sql`
  - `20250830125839_.sql`
  - `20250830125841_9195bd32-1de7-41d9-ac3c-d017d0dbe16a.sql`
  - `20250924014606_remote_schema.sql`
  - `20251018101620_remote_schema.sql`

- `app.role_rank` - Remove from 8 file(s):
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250830125648_f73e809f-f983-405f-9ed8-e17d84d48869.sql`
  - `20250830125703_5bf2f541-dcd5-4c5e-a182-de2328149a5f.sql`
  - `20250830125839_.sql`
  - `20250830125841_9195bd32-1de7-41d9-ac3c-d017d0dbe16a.sql`
  - `20250924014606_remote_schema.sql`
  - `20251018101620_remote_schema.sql`

- `app.set_tenant` - Remove from 4 file(s):
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250924014606_remote_schema.sql`
  - `20251018101620_remote_schema.sql`

- `app.touch_updated_at` - Remove from 6 file(s):
  - `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
  - `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
  - `20250830125839_.sql`
  - `20250830125841_9195bd32-1de7-41d9-ac3c-d017d0dbe16a.sql`
  - `20250924014606_remote_schema.sql`
  - `20251018101620_remote_schema.sql`

- `public.enforce_rate_limit` - Remove from 3 file(s):
  - `20250924231000_rate_limits.sql`
  - `20251004112226_e845fcd6-6600-469d-91ac-00f716b13d33.sql`
  - `20251018101620_remote_schema.sql`

- `public.handle_updated_at` - Remove from 9 file(s):
  - `20250821115117_.sql`
  - `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
  - `20250821115348_878f265d-a747-47a8-aade-2f2d66847d8c.sql`
  - `20250821115406_.sql`
  - `20250821115407_50fe85e1-e606-4424-960d-acc41a893410.sql`
  - `20250924014606_remote_schema.sql`
  - `20251004112226_e845fcd6-6600-469d-91ac-00f716b13d33.sql`
  - `20251018101620_remote_schema.sql`
  - `20251128000001_database_function_security_patch.sql`

- `public.log_agent_query` - Remove from 2 file(s):
  - `20251201000001_accounting_kb_functions.sql`
  - `20251201_accounting_kb_functions.sql`

- `public.match_knowledge_chunks` - Remove from 3 file(s):
  - `20251201000001_accounting_kb_functions.sql`
  - `20251201213700_match_knowledge_chunks_rpc.sql`
  - `20251201_accounting_kb_functions.sql`

- `public.match_vectors` - Remove from 2 file(s):
  - `001_initial_schema.sql`
  - `20251128000001_database_function_security_patch.sql`

- `public.update_updated_at_column` - Remove from 2 file(s):
  - `20251202000307_agent_production_system.sql`
  - `20260201000000_comprehensive_agent_portal.sql`

#### Enums (Use 20250103000001_enums_consolidation.sql instead)
