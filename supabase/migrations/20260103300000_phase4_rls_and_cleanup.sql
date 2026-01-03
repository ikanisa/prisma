-- ============================================
-- PHASE 4: RLS POLICIES AND DATA CLEANUP
-- Migration: Security Hardening + Data Integrity
-- Generated: 2026-01-03 (refactor-audit-plan)
-- ============================================

-- ============================================
-- SECTION 1: ENSURE RLS IS ENABLED ON ALL TABLES
-- ============================================

DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE '_prisma_%'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', tbl.schemaname, tbl.tablename);
    END LOOP;
END $$;

-- ============================================
-- SECTION 2: ADD MISSING RLS POLICIES FOR CORE TABLES
-- ============================================

-- Agents table - users can only access agents for their org
DROP POLICY IF EXISTS "agents_org_access" ON public.agents;
CREATE POLICY "agents_org_access" ON public.agents
    FOR ALL
    USING (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
    );

-- Agent executions - org-based access
DROP POLICY IF EXISTS "agent_executions_org_access" ON public.agent_executions;
CREATE POLICY "agent_executions_org_access" ON public.agent_executions
    FOR ALL
    USING (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
    );

-- Conversations - user owns their conversations
DROP POLICY IF EXISTS "conversations_user_access" ON public.conversations;
CREATE POLICY "conversations_user_access" ON public.conversations
    FOR ALL
    USING (user_id = auth.uid());

-- Conversation messages - access via conversation ownership
DROP POLICY IF EXISTS "conversation_messages_access" ON public.conversation_messages;
CREATE POLICY "conversation_messages_access" ON public.conversation_messages
    FOR ALL
    USING (
        conversation_id IN (
            SELECT id FROM public.conversations 
            WHERE user_id = auth.uid()
        )
    );

-- KB Documents - org-based access
DROP POLICY IF EXISTS "kb_documents_org_access" ON public.kb_documents;
CREATE POLICY "kb_documents_org_access" ON public.kb_documents
    FOR ALL
    USING (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
        OR org_id IS NULL  -- Public documents
    );

-- KB Chunks - inherit from parent document
DROP POLICY IF EXISTS "kb_chunks_access" ON public.kb_chunks;
CREATE POLICY "kb_chunks_access" ON public.kb_chunks
    FOR ALL
    USING (
        document_id IN (
            SELECT id FROM public.kb_documents 
            WHERE org_id IN (
                SELECT org_id FROM public.memberships 
                WHERE user_id = auth.uid()
            )
            OR org_id IS NULL
        )
    );

-- Activity log - org-based read access
DROP POLICY IF EXISTS "activity_log_org_read" ON public.activity_log;
CREATE POLICY "activity_log_org_read" ON public.activity_log
    FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
    );

-- Notifications - user can only see their own
DROP POLICY IF EXISTS "notifications_user_access" ON public.notifications;
CREATE POLICY "notifications_user_access" ON public.notifications
    FOR ALL
    USING (user_id = auth.uid());

-- ============================================
-- SECTION 3: CLEANUP ORPHANED DATA
-- ============================================

-- Delete orphaned conversation messages (no parent conversation)
DELETE FROM public.conversation_messages 
WHERE conversation_id NOT IN (SELECT id FROM public.conversations);

-- Delete orphaned kb_chunks (no parent document)
DELETE FROM public.kb_chunks 
WHERE document_id NOT IN (SELECT id FROM public.kb_documents);

-- Delete orphaned agent_tool_assignments (no parent agent)
DELETE FROM public.agent_tool_assignments 
WHERE agent_id NOT IN (SELECT id FROM public.agents);

-- Delete orphaned agent_knowledge_assignments (no parent agent)
DELETE FROM public.agent_knowledge_assignments 
WHERE agent_id NOT IN (SELECT id FROM public.agents);

-- Delete orphaned agent_guardrail_assignments (no parent agent)
DELETE FROM public.agent_guardrail_assignments 
WHERE agent_id NOT IN (SELECT id FROM public.agents);

-- ============================================
-- SECTION 4: ADD FOREIGN KEY CONSTRAINTS (DEFERRED)
-- ============================================

-- Add missing FK constraints with ON DELETE CASCADE
-- These use IF NOT EXISTS pattern for idempotency

DO $$
BEGIN
    -- conversation_messages -> conversations
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_conv_messages_conversation'
    ) THEN
        ALTER TABLE public.conversation_messages
            ADD CONSTRAINT fk_conv_messages_conversation
            FOREIGN KEY (conversation_id) 
            REFERENCES public.conversations(id) 
            ON DELETE CASCADE;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FK fk_conv_messages_conversation already exists or error: %', SQLERRM;
END $$;

DO $$
BEGIN
    -- kb_chunks -> kb_documents
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_kb_chunks_document'
    ) THEN
        ALTER TABLE public.kb_chunks
            ADD CONSTRAINT fk_kb_chunks_document
            FOREIGN KEY (document_id) 
            REFERENCES public.kb_documents(id) 
            ON DELETE CASCADE;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FK fk_kb_chunks_document already exists or error: %', SQLERRM;
END $$;

-- ============================================
-- SECTION 5: CREATE HELPER VIEWS
-- ============================================

-- View: Active agents with execution stats
CREATE OR REPLACE VIEW public.v_agent_stats AS
SELECT 
    a.id,
    a.name,
    a.org_id,
    a.status,
    COUNT(DISTINCT ae.id) as total_executions,
    COUNT(DISTINCT ae.id) FILTER (WHERE ae.status = 'success') as successful_executions,
    AVG(ae.duration_ms) as avg_duration_ms,
    MAX(ae.created_at) as last_execution_at
FROM public.agents a
LEFT JOIN public.agent_executions ae ON a.id = ae.agent_id
GROUP BY a.id, a.name, a.org_id, a.status;

-- View: Knowledge base summary per org
CREATE OR REPLACE VIEW public.v_kb_summary AS
SELECT 
    d.org_id,
    COUNT(DISTINCT d.id) as document_count,
    COUNT(DISTINCT c.id) as chunk_count,
    SUM(LENGTH(c.content)) as total_content_size,
    MAX(d.updated_at) as last_updated
FROM public.kb_documents d
LEFT JOIN public.kb_chunks c ON d.id = c.document_id
GROUP BY d.org_id;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run after migration:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

