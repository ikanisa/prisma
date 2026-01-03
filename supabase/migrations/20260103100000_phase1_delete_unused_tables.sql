-- ============================================
-- PHASE 1: DELETE UNUSED/OBSOLETE TABLES
-- Migration: Database Consolidation - Cleanup
-- ============================================
-- This migration removes clearly unused and duplicate tables.
-- Run with caution - verify no data loss before applying to production.

-- ============================================
-- SECTION 1: DROP DUPLICATE AGENT TABLES
-- ============================================

-- Drop agent_trace (duplicate of agent_traces, both superseded by agent_reasoning_traces)
DROP TABLE IF EXISTS public.agent_trace CASCADE;

-- Drop agent_traces (superseded by agent_reasoning_traces)
DROP TABLE IF EXISTS public.agent_traces CASCADE;

-- Drop agent_runs (duplicate of agent_executions)
DROP TABLE IF EXISTS public.agent_runs CASCADE;

-- Drop agent_actions (merged into agent_executions.tools_invoked JSONB)
DROP TABLE IF EXISTS public.agent_actions CASCADE;

-- Drop agent_sessions (merged into conversations)
DROP TABLE IF EXISTS public.agent_sessions CASCADE;

-- Drop agent_policy_versions (unused, guardrails are sufficient)
DROP TABLE IF EXISTS public.agent_policy_versions CASCADE;

-- Drop agent_manifests (use YAML config files instead)
DROP TABLE IF EXISTS public.agent_manifests CASCADE;

-- Drop agent_mcp_tools (merged into agent_tools)
DROP TABLE IF EXISTS public.agent_mcp_tools CASCADE;

-- Drop agent_orchestration_sessions (merged into conversations)
DROP TABLE IF EXISTS public.agent_orchestration_sessions CASCADE;

-- Drop agent_orchestration_tasks (merged into tasks)
DROP TABLE IF EXISTS public.agent_orchestration_tasks CASCADE;

-- Drop agent_safety_events (merged into agent_reasoning_traces)
DROP TABLE IF EXISTS public.agent_safety_events CASCADE;

-- Drop agent_profiles (duplicate of agent_personas)
DROP TABLE IF EXISTS public.agent_profiles CASCADE;

-- Drop agent_learning_jobs (superseded by learning system)
DROP TABLE IF EXISTS public.agent_learning_jobs CASCADE;

-- Drop agent_conversation_messages (use conversation_messages)
DROP TABLE IF EXISTS public.agent_conversation_messages CASCADE;

-- Drop agent_conversations (use conversations)
DROP TABLE IF EXISTS public.agent_conversations CASCADE;

-- Drop agent_audit_log (use activity_log)
DROP TABLE IF EXISTS public.agent_audit_log CASCADE;

-- Drop agent_versions (use agents.version column)
DROP TABLE IF EXISTS public.agent_versions CASCADE;

-- Drop agent_usage_quotas (use rate_limits)
DROP TABLE IF EXISTS public.agent_usage_quotas CASCADE;

-- ============================================
-- SECTION 2: DROP DUPLICATE KNOWLEDGE BASE TABLES
-- ============================================

-- Drop knowledge_sources (duplicate of agent_knowledge_sources)
DROP TABLE IF EXISTS public.knowledge_sources CASCADE;

-- Drop knowledge_documents (duplicate of kb_documents)
DROP TABLE IF EXISTS public.knowledge_documents CASCADE;

-- Drop knowledge_chunks (duplicate of kb_chunks)
DROP TABLE IF EXISTS public.knowledge_chunks CASCADE;

-- Drop knowledge_corpora (unused, superseded by curated_knowledge_base)
DROP TABLE IF EXISTS public.knowledge_corpora CASCADE;

-- Drop knowledge_events (merged into activity_log)
DROP TABLE IF EXISTS public.knowledge_events CASCADE;

-- Drop knowledge_sync_jobs (merged into sync_status pattern)
DROP TABLE IF EXISTS public.knowledge_sync_jobs CASCADE;

-- Drop knowledge_source_templates (move to YAML config)
DROP TABLE IF EXISTS public.knowledge_source_templates CASCADE;

-- Drop knowledge_search_analytics (merged into telemetry)
DROP TABLE IF EXISTS public.knowledge_search_analytics CASCADE;

-- Drop kb_sources (duplicate of deep_search_sources)
DROP TABLE IF EXISTS public.kb_sources CASCADE;

-- Drop kb_runs (unused)
DROP TABLE IF EXISTS public.kb_runs CASCADE;

-- Drop kb_summaries (merged into curated_knowledge_base)
DROP TABLE IF EXISTS public.kb_summaries CASCADE;

-- Drop kb_tags (use array column in curated_knowledge_base)
DROP TABLE IF EXISTS public.kb_tags CASCADE;

-- Drop kb_document_text (merged into kb_documents)
DROP TABLE IF EXISTS public.kb_document_text CASCADE;

-- Drop kb_audit_trail (merged into agent_reasoning_traces)
DROP TABLE IF EXISTS public.kb_audit_trail CASCADE;

-- ============================================
-- SECTION 3: DROP DUPLICATE CHAT TABLES
-- ============================================

-- Drop chat_sessions (duplicate of conversations)
DROP TABLE IF EXISTS public.chat_sessions CASCADE;

-- Drop chat_messages (duplicate of conversation_messages)
DROP TABLE IF EXISTS public.chat_messages CASCADE;

-- Drop chatkit_sessions (merged into conversations)
DROP TABLE IF EXISTS public.chatkit_sessions CASCADE;

-- Drop chatkit_turn_config (merged into conversations.metadata)
DROP TABLE IF EXISTS public.chatkit_turn_config CASCADE;

-- Drop chatkit_session_transcripts (use conversation_messages)
DROP TABLE IF EXISTS public.chatkit_session_transcripts CASCADE;

-- ============================================
-- SECTION 4: DROP DUPLICATE LEARNING TABLES
-- ============================================

-- Drop learning_examples (duplicate of agent_learning_examples)
DROP TABLE IF EXISTS public.learning_examples CASCADE;

-- Drop learning_signals (merged into learning_metrics)
DROP TABLE IF EXISTS public.learning_signals CASCADE;

-- Drop dataset_examples (merged into training_datasets)
DROP TABLE IF EXISTS public.dataset_examples CASCADE;

-- Drop expert_annotations (merged into agent_learning_examples)
DROP TABLE IF EXISTS public.expert_annotations CASCADE;

-- Drop training_runs (duplicate of learning_runs)
DROP TABLE IF EXISTS public.training_runs CASCADE;

-- ============================================
-- SECTION 5: DROP LEGACY/OBSOLETE TABLES
-- ============================================

-- Drop categories (legacy, unused)
DROP TABLE IF EXISTS public.categories CASCADE;

-- Drop chunks (replaced by kb_chunks)
DROP TABLE IF EXISTS public.chunks CASCADE;

-- Drop vendors (unused)
DROP TABLE IF EXISTS public.vendors CASCADE;

-- Drop vendor_category_mappings (unused)
DROP TABLE IF EXISTS public.vendor_category_mappings CASCADE;

-- Drop risks (duplicate of audit_risks)
DROP TABLE IF EXISTS public.risks CASCADE;

-- Drop query_hints (unused)
DROP TABLE IF EXISTS public.query_hints CASCADE;

-- Drop independence_checks (duplicate of independence_assessments)
DROP TABLE IF EXISTS public.independence_checks CASCADE;

-- Drop openai_debug_events (dev-only)
DROP TABLE IF EXISTS public.openai_debug_events CASCADE;

-- Drop citation_canonicalizer (unused)
DROP TABLE IF EXISTS public.citation_canonicalizer CASCADE;

-- Drop denylist_deboost (merge into guardrails config)
DROP TABLE IF EXISTS public.denylist_deboost CASCADE;

-- Drop app_users (duplicate of profiles)
DROP TABLE IF EXISTS public.app_users CASCADE;

-- Drop user_invitations (use Supabase Auth invites)
DROP TABLE IF EXISTS public.user_invitations CASCADE;

-- ============================================
-- SECTION 6: DROP AUDIT-RELATED DUPLICATES
-- ============================================

-- Drop acceptance_decisions (merged into engagements.metadata)
DROP TABLE IF EXISTS public.acceptance_decisions CASCADE;

-- Drop plan_change_log (use activity_log instead)
DROP TABLE IF EXISTS public.plan_change_log CASCADE;

-- ============================================
-- SECTION 7: DROP TAX-RELATED CONSOLIDATIONS
-- ============================================

-- Drop vat_rules (merged into tax table)
DROP TABLE IF EXISTS public.vat_rules CASCADE;

-- Drop return_files (merged into documents)
DROP TABLE IF EXISTS public.return_files CASCADE;

-- ============================================
-- SECTION 8: DROP ACCOUNTING-RELATED CONSOLIDATIONS
-- ============================================

-- Drop accounting (generic, use specific ledger tables)
DROP TABLE IF EXISTS public.accounting CASCADE;

-- Drop fs_lines (merged into trial_balance_snapshots)
DROP TABLE IF EXISTS public.fs_lines CASCADE;

-- Drop transactions (use ledger_entries)
DROP TABLE IF EXISTS public.transactions CASCADE;

-- ============================================
-- CLEANUP: Drop orphaned types if safe
-- ============================================

-- Note: Only drop enums if no longer referenced
-- These are commented out for safety - uncomment if verified unused
-- DROP TYPE IF EXISTS public.agent_status CASCADE;
-- DROP TYPE IF EXISTS public.learning_status CASCADE;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this after migration to verify remaining table count:
-- SELECT COUNT(*) FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
