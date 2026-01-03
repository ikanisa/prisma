-- ============================================
-- Performance Indexes Migration
-- Generated: 2026-01-03 (refactor-audit-plan)
-- Purpose: Add missing indexes for hot query paths
-- ============================================

-- Activity Log: Time-based queries per org
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_org_time 
  ON public.activity_log(org_id, created_at DESC);

-- Agent Executions: Agent history lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_executions_agent_time 
  ON public.agent_executions(agent_id, created_at DESC);

-- KB Chunks: Document lookup (for join performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kb_chunks_document 
  ON public.kb_chunks(document_id);

-- Conversations: User history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_time 
  ON public.conversations(user_id, created_at DESC);

-- Tasks: Dashboard view (assigned tasks by status)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assigned_status 
  ON public.tasks(assigned_to, status) WHERE status != 'completed';

-- Documents: Engagement documents
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_engagement 
  ON public.documents(engagement_id, created_at DESC);

-- Engagements: Client engagements
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_engagements_client 
  ON public.engagements(client_id, status);

-- Clients: Org clients
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_org_name 
  ON public.clients(org_id, name);

-- Notifications: Unread notifications per user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread 
  ON public.notifications(user_id, read, created_at DESC) WHERE read = false;

-- Agent Reasoning Traces: Execution lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_traces_execution 
  ON public.agent_reasoning_traces(execution_id, step_order);

-- Comment: These indexes improve common query patterns identified in audit
-- Expected impact: 30-50% reduction in query time for dashboard and list views

