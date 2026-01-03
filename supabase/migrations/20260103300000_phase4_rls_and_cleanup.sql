-- ============================================
-- PHASE 4: RLS POLICIES AND DATA CLEANUP
-- Migration: Security Hardening + Data Integrity
-- Generated: 2026-01-03 (refactor-audit-plan)
-- Note: Uses defensive checks for table/column existence
-- ============================================

-- Helper function to check if column exists
CREATE OR REPLACE FUNCTION _temp_col_exists(t_name text, c_name text) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = t_name AND column_name = c_name
  );
END;
$$ LANGUAGE plpgsql;

-- Helper function to check if table exists
CREATE OR REPLACE FUNCTION _temp_tbl_exists(t_name text) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = t_name
  );
END;
$$ LANGUAGE plpgsql;

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
-- (Only for tables that exist with required columns)
-- ============================================

-- Agents table - users can only access agents for their org
DO $$ BEGIN
  IF _temp_tbl_exists('agents') AND _temp_col_exists('agents', 'org_id') AND _temp_tbl_exists('memberships') THEN
    DROP POLICY IF EXISTS "agents_org_access" ON public.agents;
    EXECUTE 'CREATE POLICY "agents_org_access" ON public.agents
        FOR ALL
        USING (
            org_id IN (
                SELECT org_id FROM public.memberships 
                WHERE user_id = auth.uid()
            )
        )';
  END IF;
END $$;

-- Agent executions - org-based access
DO $$ BEGIN
  IF _temp_tbl_exists('agent_executions') AND _temp_col_exists('agent_executions', 'org_id') AND _temp_tbl_exists('memberships') THEN
    DROP POLICY IF EXISTS "agent_executions_org_access" ON public.agent_executions;
    EXECUTE 'CREATE POLICY "agent_executions_org_access" ON public.agent_executions
        FOR ALL
        USING (
            org_id IN (
                SELECT org_id FROM public.memberships 
                WHERE user_id = auth.uid()
            )
        )';
  END IF;
END $$;

-- Conversations - user owns their conversations
DO $$ BEGIN
  IF _temp_tbl_exists('conversations') AND _temp_col_exists('conversations', 'user_id') THEN
    DROP POLICY IF EXISTS "conversations_user_access" ON public.conversations;
    EXECUTE 'CREATE POLICY "conversations_user_access" ON public.conversations
        FOR ALL
        USING (user_id = auth.uid())';
  END IF;
END $$;

-- Conversation messages - access via conversation ownership
DO $$ BEGIN
  IF _temp_tbl_exists('conversation_messages') AND _temp_col_exists('conversation_messages', 'conversation_id') AND _temp_tbl_exists('conversations') THEN
    DROP POLICY IF EXISTS "conversation_messages_access" ON public.conversation_messages;
    EXECUTE 'CREATE POLICY "conversation_messages_access" ON public.conversation_messages
        FOR ALL
        USING (
            conversation_id IN (
                SELECT id FROM public.conversations 
                WHERE user_id = auth.uid()
            )
        )';
  END IF;
END $$;

-- KB Documents - org-based access
DO $$ BEGIN
  IF _temp_tbl_exists('kb_documents') AND _temp_col_exists('kb_documents', 'org_id') AND _temp_tbl_exists('memberships') THEN
    DROP POLICY IF EXISTS "kb_documents_org_access" ON public.kb_documents;
    EXECUTE 'CREATE POLICY "kb_documents_org_access" ON public.kb_documents
        FOR ALL
        USING (
            org_id IN (
                SELECT org_id FROM public.memberships 
                WHERE user_id = auth.uid()
            )
            OR org_id IS NULL
        )';
  END IF;
END $$;

-- KB Chunks - inherit from parent document
DO $$ BEGIN
  IF _temp_tbl_exists('kb_chunks') AND _temp_col_exists('kb_chunks', 'document_id') AND _temp_tbl_exists('kb_documents') THEN
    DROP POLICY IF EXISTS "kb_chunks_access" ON public.kb_chunks;
    EXECUTE 'CREATE POLICY "kb_chunks_access" ON public.kb_chunks
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
        )';
  END IF;
END $$;

-- Activity log - org-based read access
DO $$ BEGIN
  IF _temp_tbl_exists('activity_log') AND _temp_col_exists('activity_log', 'org_id') AND _temp_tbl_exists('memberships') THEN
    DROP POLICY IF EXISTS "activity_log_org_read" ON public.activity_log;
    EXECUTE 'CREATE POLICY "activity_log_org_read" ON public.activity_log
        FOR SELECT
        USING (
            org_id IN (
                SELECT org_id FROM public.memberships 
                WHERE user_id = auth.uid()
            )
        )';
  END IF;
END $$;

-- Notifications - user can only see their own
DO $$ BEGIN
  IF _temp_tbl_exists('notifications') AND _temp_col_exists('notifications', 'user_id') THEN
    DROP POLICY IF EXISTS "notifications_user_access" ON public.notifications;
    EXECUTE 'CREATE POLICY "notifications_user_access" ON public.notifications
        FOR ALL
        USING (user_id = auth.uid())';
  END IF;
END $$;

-- ============================================
-- SECTION 3: CLEANUP ORPHANED DATA (IF TABLES EXIST)
-- ============================================

DO $$ BEGIN
  IF _temp_tbl_exists('conversation_messages') AND _temp_tbl_exists('conversations') THEN
    DELETE FROM public.conversation_messages 
    WHERE conversation_id NOT IN (SELECT id FROM public.conversations);
  END IF;
END $$;

DO $$ BEGIN
  IF _temp_tbl_exists('kb_chunks') AND _temp_tbl_exists('kb_documents') THEN
    DELETE FROM public.kb_chunks 
    WHERE document_id NOT IN (SELECT id FROM public.kb_documents);
  END IF;
END $$;

DO $$ BEGIN
  IF _temp_tbl_exists('agent_tool_assignments') AND _temp_tbl_exists('agents') THEN
    DELETE FROM public.agent_tool_assignments 
    WHERE agent_id NOT IN (SELECT id FROM public.agents);
  END IF;
END $$;

DO $$ BEGIN
  IF _temp_tbl_exists('agent_knowledge_assignments') AND _temp_tbl_exists('agents') THEN
    DELETE FROM public.agent_knowledge_assignments 
    WHERE agent_id NOT IN (SELECT id FROM public.agents);
  END IF;
END $$;

DO $$ BEGIN
  IF _temp_tbl_exists('agent_guardrail_assignments') AND _temp_tbl_exists('agents') THEN
    DELETE FROM public.agent_guardrail_assignments 
    WHERE agent_id NOT IN (SELECT id FROM public.agents);
  END IF;
END $$;

-- ============================================
-- SECTION 4: ADD FOREIGN KEY CONSTRAINTS (IF APPLICABLE)
-- ============================================

DO $$
BEGIN
    IF _temp_tbl_exists('conversation_messages') AND _temp_tbl_exists('conversations') THEN
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
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FK fk_conv_messages_conversation error: %', SQLERRM;
END $$;

DO $$
BEGIN
    IF _temp_tbl_exists('kb_chunks') AND _temp_tbl_exists('kb_documents') THEN
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
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FK fk_kb_chunks_document error: %', SQLERRM;
END $$;

-- ============================================
-- SECTION 5: CREATE HELPER VIEWS (IF TABLES EXIST)
-- ============================================

DO $$ BEGIN
  IF _temp_tbl_exists('agents') AND _temp_tbl_exists('agent_executions') AND 
     _temp_col_exists('agents', 'org_id') AND _temp_col_exists('agents', 'status') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW public.v_agent_stats AS
      SELECT 
          a.id,
          a.name,
          a.org_id,
          a.status,
          COUNT(DISTINCT ae.id) as total_executions,
          COUNT(DISTINCT ae.id) FILTER (WHERE ae.status = ''success'') as successful_executions,
          AVG(ae.duration_ms) as avg_duration_ms,
          MAX(ae.created_at) as last_execution_at
      FROM public.agents a
      LEFT JOIN public.agent_executions ae ON a.id = ae.agent_id
      GROUP BY a.id, a.name, a.org_id, a.status';
  END IF;
END $$;

DO $$ BEGIN
  IF _temp_tbl_exists('kb_documents') AND _temp_tbl_exists('kb_chunks') AND _temp_col_exists('kb_documents', 'org_id') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW public.v_kb_summary AS
      SELECT 
          d.org_id,
          COUNT(DISTINCT d.id) as document_count,
          COUNT(DISTINCT c.id) as chunk_count,
          SUM(LENGTH(c.content)) as total_content_size,
          MAX(d.updated_at) as last_updated
      FROM public.kb_documents d
      LEFT JOIN public.kb_chunks c ON d.id = c.document_id
      GROUP BY d.org_id';
  END IF;
END $$;

-- Cleanup helper functions
DROP FUNCTION IF EXISTS _temp_col_exists(text, text);
DROP FUNCTION IF EXISTS _temp_tbl_exists(text);

-- ============================================
-- VERIFICATION
-- ============================================
-- Run after migration:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
