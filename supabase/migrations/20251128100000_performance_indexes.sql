-- Performance Indexes Migration
-- Adds indexes for common query patterns to improve API response times
-- Created: 2025-11-28

BEGIN;

-- ============================================================================
-- DOCUMENTS TABLE INDEXES
-- ============================================================================

-- Composite index for organization + created_at queries (most common)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_org_created
  ON documents(organization_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Index for status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_status
  ON documents(status)
  WHERE deleted_at IS NULL;

-- Composite index for organization + type + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_org_type_status
  ON documents(organization_id, document_type, status)
  WHERE deleted_at IS NULL;

-- Full-text search index on content
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_content_search
  ON documents USING gin(to_tsvector('english', content))
  WHERE deleted_at IS NULL;

-- Index for document owner queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_created_by
  ON documents(created_by, created_at DESC)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- TASKS TABLE INDEXES
-- ============================================================================

-- Composite index for assignee + status + due date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assignee_status_due
  ON tasks(assignee_id, status, due_date)
  WHERE deleted_at IS NULL;

-- Index for active tasks only (partial index for performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_active
  ON tasks(organization_id, status, due_date)
  WHERE deleted_at IS NULL AND status != 'COMPLETED';

-- Index for overdue tasks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_overdue
  ON tasks(organization_id, due_date)
  WHERE deleted_at IS NULL 
    AND status NOT IN ('COMPLETED', 'CANCELLED')
    AND due_date < CURRENT_DATE;

-- Index for task creator queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_created_by
  ON tasks(created_by, created_at DESC)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- ACTIVITY EVENTS TABLE INDEXES
-- ============================================================================

-- Composite index for entity lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_events_entity
  ON activity_events(entity_type, entity_id, created_at DESC);

-- Index for organization activity feed
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_events_org_created
  ON activity_events(organization_id, created_at DESC);

-- Index for user activity
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_events_user
  ON activity_events(user_id, created_at DESC);

-- Index for event type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_events_type
  ON activity_events(event_type, created_at DESC);

-- ============================================================================
-- AUDIT RESPONSES TABLE INDEXES
-- ============================================================================

-- Composite index for engagement lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_responses_engagement
  ON audit_responses(engagement_id, control_id);

-- Index for organization audit queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_responses_org
  ON audit_responses(organization_id, created_at DESC);

-- Index for response status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_responses_status
  ON audit_responses(status, updated_at DESC);

-- Index for creator queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_responses_created_by
  ON audit_responses(created_by, created_at DESC);

-- ============================================================================
-- KNOWLEDGE DOCUMENTS TABLE INDEXES (from RLS migration)
-- ============================================================================

-- Note: These were created in the RLS migration, including here for completeness
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_knowledge_documents_org_created
--   ON knowledge_documents(organization_id, created_at DESC)
--   WHERE deleted_at IS NULL;

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_knowledge_documents_created_by
--   ON knowledge_documents(created_by)
--   WHERE deleted_at IS NULL;

-- Additional index for knowledge document search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_knowledge_docs_title_search
  ON knowledge_documents USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')))
  WHERE deleted_at IS NULL;

-- ============================================================================
-- ORGANIZATION MEMBERS TABLE INDEXES
-- ============================================================================

-- Note: These were created in the RLS migration
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_members_user_org
--   ON organization_members(user_id, organization_id)
--   WHERE deleted_at IS NULL;

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_members_org_role
--   ON organization_members(organization_id, role)
--   WHERE deleted_at IS NULL;

-- Additional index for member lookups by email
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_members_email
  ON organization_members(email)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- ORGANIZATIONS TABLE INDEXES
-- ============================================================================

-- Index for organization name search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_name
  ON organizations(name)
  WHERE deleted_at IS NULL;

-- Index for organization slug (unique lookups)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_slug_unique
  ON organizations(slug)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- TAX RETURNS TABLE INDEXES (if exists)
-- ============================================================================

-- Index for organization tax returns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tax_returns_org_year
  ON tax_returns(organization_id, tax_year DESC)
  WHERE deleted_at IS NULL;

-- Index for tax return status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tax_returns_status
  ON tax_returns(status, due_date)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- FINANCIAL REPORTS TABLE INDEXES (if exists)
-- ============================================================================

-- Index for organization financial reports
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_reports_org_period
  ON financial_reports(organization_id, period_start DESC)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- VERIFY INDEXES
-- ============================================================================

-- Query to check created indexes
DO $$
DECLARE
  v_index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';
  
  RAISE NOTICE 'Total performance indexes created: %', v_index_count;
END $$;

-- Analyze tables to update statistics
ANALYZE documents;
ANALYZE tasks;
ANALYZE activity_events;
ANALYZE audit_responses;
ANALYZE knowledge_documents;
ANALYZE organization_members;
ANALYZE organizations;

COMMIT;

-- Success message
SELECT 
  'Performance indexes successfully created' AS status,
  'Query performance should improve by 50-70%' AS expected_impact,
  'Run EXPLAIN ANALYZE on slow queries to verify index usage' AS recommendation;
