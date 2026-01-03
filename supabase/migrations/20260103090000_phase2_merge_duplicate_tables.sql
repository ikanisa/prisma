-- ============================================
-- PHASE 2: MERGE DUPLICATE TABLES
-- Migration: Database Consolidation - Data Merge
-- ============================================
-- This migration merges data from duplicate tables before they are dropped.
-- Must be run BEFORE Phase 1 if tables contain data to preserve.

-- ============================================
-- SECTION 1: MERGE KB EMBEDDINGS INTO KB_CHUNKS
-- ============================================

-- Add embedding column to kb_chunks if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kb_chunks' AND column_name = 'embedding_vector'
    ) THEN
        ALTER TABLE public.kb_chunks ADD COLUMN embedding_vector vector(1536);
    END IF;
END $$;

-- Migrate embeddings from kb_embeddings to kb_chunks
UPDATE public.kb_chunks kc
SET embedding_vector = ke.embedding
FROM public.kb_embeddings ke
WHERE kc.id = ke.chunk_id
  AND kc.embedding_vector IS NULL
  AND ke.embedding IS NOT NULL;

-- ============================================
-- SECTION 2: MERGE CHAT_SESSIONS INTO CONVERSATIONS
-- ============================================

-- Ensure conversations table has all necessary columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'model'
    ) THEN
        ALTER TABLE public.conversations ADD COLUMN model VARCHAR(100);
    END IF;
END $$;

-- Migrate chat_sessions to conversations (if chat_sessions exists)
INSERT INTO public.conversations (id, user_id, organization_id, title, model, created_at, updated_at)
SELECT 
    cs.id,
    cs.user_id,
    cs.organization_id,
    cs.title,
    cs.model,
    cs.created_at,
    cs.updated_at
FROM public.chat_sessions cs
WHERE NOT EXISTS (
    SELECT 1 FROM public.conversations c WHERE c.id = cs.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SECTION 3: MERGE CHAT_MESSAGES INTO CONVERSATION_MESSAGES
-- ============================================

-- Migrate chat_messages to conversation_messages
INSERT INTO public.conversation_messages (id, conversation_id, role, content, metadata, created_at)
SELECT 
    cm.id,
    cm.session_id AS conversation_id,
    cm.role,
    cm.content,
    cm.metadata,
    cm.created_at
FROM public.chat_messages cm
WHERE NOT EXISTS (
    SELECT 1 FROM public.conversation_messages m WHERE m.id = cm.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SECTION 4: MERGE AGENT_RUNS INTO AGENT_EXECUTIONS
-- ============================================

-- Ensure agent_executions has all necessary columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_executions' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.agent_executions ADD COLUMN status VARCHAR(50) DEFAULT 'completed';
    END IF;
END $$;

-- Migrate agent_runs to agent_executions (if agent_runs exists)
INSERT INTO public.agent_executions (
    id, agent_id, organization_id, user_id, 
    input_text, output_text, 
    input_tokens, output_tokens,
    latency_ms, model_used,
    status, created_at
)
SELECT 
    ar.id,
    ar.agent_id,
    ar.org_id,
    ar.user_id,
    ar.input,
    ar.output,
    ar.input_tokens,
    ar.output_tokens,
    ar.duration_ms,
    ar.model,
    ar.status,
    ar.created_at
FROM public.agent_runs ar
WHERE NOT EXISTS (
    SELECT 1 FROM public.agent_executions ae WHERE ae.id = ar.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SECTION 5: MERGE LEARNING_EXAMPLES INTO AGENT_LEARNING_EXAMPLES
-- ============================================

INSERT INTO public.agent_learning_examples (
    id, agent_id, example_type, 
    input_text, expected_output, actual_output,
    tags, importance, is_approved,
    created_at
)
SELECT 
    le.id,
    le.agent_id,
    COALESCE(le.type, 'positive')::VARCHAR(50),
    le.input,
    le.expected_output,
    le.actual_output,
    le.tags,
    COALESCE(le.priority, 1),
    COALESCE(le.is_approved, false),
    le.created_at
FROM public.learning_examples le
WHERE NOT EXISTS (
    SELECT 1 FROM public.agent_learning_examples ale WHERE ale.id = le.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SECTION 6: MERGE AGENT_TRACES INTO AGENT_REASONING_TRACES
-- ============================================

INSERT INTO public.agent_reasoning_traces (
    id, organization_id, agent_id,
    query_text, reasoning_steps, final_answer,
    confidence_score, total_latency_ms,
    created_at
)
SELECT 
    at.id,
    at.org_id,
    at.agent_id,
    at.input,
    COALESCE(at.trace_data, '[]'::jsonb),
    at.output,
    at.confidence,
    at.duration_ms,
    at.created_at
FROM public.agent_traces at
WHERE NOT EXISTS (
    SELECT 1 FROM public.agent_reasoning_traces art WHERE art.id = at.id
)
ON CONFLICT (id) DO NOTHING;

-- Also migrate from agent_trace if it exists
INSERT INTO public.agent_reasoning_traces (
    id, organization_id, agent_id,
    query_text, reasoning_steps, final_answer,
    confidence_score, total_latency_ms,
    created_at
)
SELECT 
    at.id,
    at.org_id,
    at.agent_id,
    at.input,
    COALESCE(at.trace_data, '[]'::jsonb),
    at.output,
    at.confidence,
    at.duration_ms,
    at.created_at
FROM public.agent_trace at
WHERE NOT EXISTS (
    SELECT 1 FROM public.agent_reasoning_traces art WHERE art.id = at.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SECTION 7: MERGE KB_SOURCES INTO DEEP_SEARCH_SOURCES
-- ============================================

INSERT INTO public.deep_search_sources (
    id, name, description, source_type,
    base_url, verification_level, source_priority,
    is_active, created_at, updated_at
)
SELECT 
    ks.id,
    ks.name,
    ks.description,
    COALESCE(ks.type, 'company_policy')::VARCHAR(50),
    ks.url,
    COALESCE(ks.verification_level, 'secondary')::public.knowledge_verification_level,
    COALESCE(ks.priority, 'supplementary')::public.knowledge_source_priority,
    COALESCE(ks.is_active, true),
    ks.created_at,
    ks.updated_at
FROM public.kb_sources ks
WHERE NOT EXISTS (
    SELECT 1 FROM public.deep_search_sources dss WHERE dss.id = ks.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SECTION 8: CONSOLIDATE ACTIVITY LOGS
-- ============================================

-- Merge knowledge_events into activity_log if not already there
INSERT INTO public.activity_log (
    id, org_id, actor_id, action,
    resource_type, resource_id, metadata,
    created_at
)
SELECT 
    ke.id,
    ke.org_id,
    ke.user_id,
    ke.event_type,
    'knowledge_source',
    ke.source_id,
    ke.metadata,
    ke.created_at
FROM public.knowledge_events ke
WHERE NOT EXISTS (
    SELECT 1 FROM public.activity_log al WHERE al.id = ke.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SECTION 9: MERGE LEARNING_SIGNALS INTO LEARNING_METRICS
-- ============================================

INSERT INTO public.learning_metrics (
    id, experiment_id, run_id,
    metric_name, metric_value, metadata,
    recorded_at
)
SELECT 
    ls.id,
    ls.experiment_id,
    ls.run_id,
    ls.signal_type,
    ls.value,
    ls.metadata,
    ls.created_at
FROM public.learning_signals ls
WHERE NOT EXISTS (
    SELECT 1 FROM public.learning_metrics lm WHERE lm.id = ls.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify data was migrated correctly:

-- SELECT 'conversations' as table_name, COUNT(*) as count FROM conversations
-- UNION ALL SELECT 'conversation_messages', COUNT(*) FROM conversation_messages
-- UNION ALL SELECT 'agent_executions', COUNT(*) FROM agent_executions
-- UNION ALL SELECT 'agent_reasoning_traces', COUNT(*) FROM agent_reasoning_traces
-- UNION ALL SELECT 'agent_learning_examples', COUNT(*) FROM agent_learning_examples;
