-- ============================================
-- Performance Indexes Migration
-- Generated: 2026-01-03 (refactor-audit-plan)
-- Purpose: Add missing indexes for hot query paths
-- Note: Uses conditional creation to handle missing tables/columns gracefully
-- ============================================

-- Helper function to check if column exists
CREATE OR REPLACE FUNCTION _temp_column_exists(t_name text, c_name text) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = t_name AND column_name = c_name
  );
END;
$$ LANGUAGE plpgsql;

-- Activity Log: Time-based queries per org
DO $$ BEGIN
  IF _temp_column_exists('activity_log', 'org_id') AND _temp_column_exists('activity_log', 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_activity_log_org_time ON public.activity_log(org_id, created_at DESC);
  END IF;
END $$;

-- Agent Executions: Agent history lookup
DO $$ BEGIN
  IF _temp_column_exists('agent_executions', 'agent_id') AND _temp_column_exists('agent_executions', 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_agent_executions_agent_time ON public.agent_executions(agent_id, created_at DESC);
  END IF;
END $$;

-- KB Chunks: Document lookup (for join performance)
DO $$ BEGIN
  IF _temp_column_exists('kb_chunks', 'document_id') THEN
    CREATE INDEX IF NOT EXISTS idx_kb_chunks_document ON public.kb_chunks(document_id);
  END IF;
END $$;

-- Conversations: User history
DO $$ BEGIN
  IF _temp_column_exists('conversations', 'user_id') AND _temp_column_exists('conversations', 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_conversations_user_time ON public.conversations(user_id, created_at DESC);
  END IF;
END $$;

-- Tasks: Dashboard view (assigned tasks by status)
DO $$ BEGIN
  IF _temp_column_exists('tasks', 'assigned_to') AND _temp_column_exists('tasks', 'status') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON public.tasks(assigned_to, status) WHERE status != ''completed''';
  END IF;
END $$;

-- Documents: Engagement documents
DO $$ BEGIN
  IF _temp_column_exists('documents', 'engagement_id') AND _temp_column_exists('documents', 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_documents_engagement ON public.documents(engagement_id, created_at DESC);
  END IF;
END $$;

-- Engagements: Client engagements
DO $$ BEGIN
  IF _temp_column_exists('engagements', 'client_id') AND _temp_column_exists('engagements', 'status') THEN
    CREATE INDEX IF NOT EXISTS idx_engagements_client ON public.engagements(client_id, status);
  END IF;
END $$;

-- Clients: Org clients
DO $$ BEGIN
  IF _temp_column_exists('clients', 'org_id') AND _temp_column_exists('clients', 'name') THEN
    CREATE INDEX IF NOT EXISTS idx_clients_org_name ON public.clients(org_id, name);
  END IF;
END $$;

-- Notifications: Unread notifications per user
DO $$ BEGIN
  IF _temp_column_exists('notifications', 'user_id') AND _temp_column_exists('notifications', 'read') AND _temp_column_exists('notifications', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read, created_at DESC) WHERE read = false';
  END IF;
END $$;

-- Agent Reasoning Traces: Execution lookup
DO $$ BEGIN
  IF _temp_column_exists('agent_reasoning_traces', 'execution_id') AND _temp_column_exists('agent_reasoning_traces', 'step_order') THEN
    CREATE INDEX IF NOT EXISTS idx_agent_traces_execution ON public.agent_reasoning_traces(execution_id, step_order);
  END IF;
END $$;

-- Cleanup helper function
DROP FUNCTION IF EXISTS _temp_column_exists(text, text);

-- Comment: These indexes improve common query patterns identified in audit
-- Expected impact: 30-50% reduction in query time for dashboard and list views
