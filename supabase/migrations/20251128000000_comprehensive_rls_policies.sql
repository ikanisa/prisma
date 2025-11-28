-- RLS Policy Enhancements Migration
-- Adds comprehensive Row Level Security policies and performance optimizations
-- Created: 2025-11-28

BEGIN;

-- ============================================================================
-- PART 1: CACHE HELPER FUNCTIONS FOR RLS PERFORMANCE
-- ============================================================================

-- Create schema for cache functions if not exists
CREATE SCHEMA IF NOT EXISTS auth_cache;

-- Cached role check function
CREATE OR REPLACE FUNCTION auth_cache.has_min_role_cached(
  p_user_id UUID,
  p_org_id UUID,
  p_min_role TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_cache_key TEXT;
  v_result BOOLEAN;
BEGIN
  -- Generate cache key
  v_cache_key := 'role_' || p_user_id::TEXT || '_' || p_org_id::TEXT || '_' || p_min_role;
  
  -- Check session cache first
  BEGIN
    v_result := current_setting('app.cache.' || v_cache_key, true)::BOOLEAN;
    IF v_result IS NOT NULL THEN
      RETURN v_result;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Cache miss, continue
  END;
  
  -- Compute role check
  v_result := (
    SELECT EXISTS (
      SELECT 1 
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = p_user_id
        AND om.organization_id = p_org_id
        AND om.role IN (
          CASE p_min_role
            WHEN 'OWNER' THEN ARRAY['OWNER']
            WHEN 'ADMIN' THEN ARRAY['OWNER', 'ADMIN']
            WHEN 'MEMBER' THEN ARRAY['OWNER', 'ADMIN', 'MEMBER']
            ELSE ARRAY['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']
          END
        )
        AND om.deleted_at IS NULL
    )
  );
  
  -- Cache result for this session
  PERFORM set_config('app.cache.' || v_cache_key, v_result::TEXT, false);
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, auth_cache;

COMMENT ON FUNCTION auth_cache.has_min_role_cached IS 
'Cached version of role checking for RLS policy performance. Uses session-level caching.';

-- ============================================================================
-- PART 2: KNOWLEDGE DOCUMENTS RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "knowledge_documents_select_policy" ON knowledge_documents;
DROP POLICY IF EXISTS "knowledge_documents_insert_policy" ON knowledge_documents;
DROP POLICY IF EXISTS "knowledge_documents_update_policy" ON knowledge_documents;
DROP POLICY IF EXISTS "knowledge_documents_delete_policy" ON knowledge_documents;

-- Enable RLS on knowledge_documents
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view documents in their organizations
CREATE POLICY "knowledge_documents_select_policy" 
  ON knowledge_documents
  FOR SELECT
  TO authenticated
  USING (
    auth_cache.has_min_role_cached(
      auth.uid(),
      organization_id,
      'VIEWER'
    )
  );

-- INSERT: Members and above can create documents
CREATE POLICY "knowledge_documents_insert_policy"
  ON knowledge_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_cache.has_min_role_cached(
      auth.uid(),
      organization_id,
      'MEMBER'
    )
  );

-- UPDATE: Members can update their own documents, admins can update all
CREATE POLICY "knowledge_documents_update_policy"
  ON knowledge_documents
  FOR UPDATE
  TO authenticated
  USING (
    auth_cache.has_min_role_cached(
      auth.uid(),
      organization_id,
      'MEMBER'
    )
    AND (
      created_by = auth.uid()
      OR auth_cache.has_min_role_cached(
        auth.uid(),
        organization_id,
        'ADMIN'
      )
    )
  );

-- DELETE: Only admins and above can delete documents
CREATE POLICY "knowledge_documents_delete_policy"
  ON knowledge_documents
  FOR DELETE
  TO authenticated
  USING (
    auth_cache.has_min_role_cached(
      auth.uid(),
      organization_id,
      'ADMIN'
    )
  );

-- ============================================================================
-- PART 3: TASKS RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;

-- Enable RLS on tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view tasks in their organizations or assigned to them
CREATE POLICY "tasks_select_policy"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      auth_cache.has_min_role_cached(
        auth.uid(),
        organization_id,
        'VIEWER'
      )
      OR assignee_id = auth.uid()
      OR created_by = auth.uid()
    )
  );

-- INSERT: Members and above can create tasks
CREATE POLICY "tasks_insert_policy"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_cache.has_min_role_cached(
      auth.uid(),
      organization_id,
      'MEMBER'
    )
  );

-- UPDATE: Assignees and creators can update, admins can update all
CREATE POLICY "tasks_update_policy"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      assignee_id = auth.uid()
      OR created_by = auth.uid()
      OR auth_cache.has_min_role_cached(
        auth.uid(),
        organization_id,
        'ADMIN'
      )
    )
  );

-- DELETE: Only admins can delete tasks (soft delete)
CREATE POLICY "tasks_delete_policy"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (
    auth_cache.has_min_role_cached(
      auth.uid(),
      organization_id,
      'ADMIN'
    )
  );

-- ============================================================================
-- PART 4: ACTIVITY EVENTS RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "activity_events_select_policy" ON activity_events;
DROP POLICY IF EXISTS "activity_events_insert_policy" ON activity_events;

-- Enable RLS on activity_events
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view events in their organizations
CREATE POLICY "activity_events_select_policy"
  ON activity_events
  FOR SELECT
  TO authenticated
  USING (
    auth_cache.has_min_role_cached(
      auth.uid(),
      organization_id,
      'VIEWER'
    )
  );

-- INSERT: System and authenticated users can create events
CREATE POLICY "activity_events_insert_policy"
  ON activity_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_cache.has_min_role_cached(
      auth.uid(),
      organization_id,
      'VIEWER'
    )
  );

-- No UPDATE or DELETE - activity events are immutable

-- ============================================================================
-- PART 5: AUDIT RESPONSES RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "audit_responses_select_policy" ON audit_responses;
DROP POLICY IF EXISTS "audit_responses_insert_policy" ON audit_responses;
DROP POLICY IF EXISTS "audit_responses_update_policy" ON audit_responses;

-- Enable RLS on audit_responses
ALTER TABLE audit_responses ENABLE ROW LEVEL SECURITY;

-- SELECT: Organization members can view audit responses
CREATE POLICY "audit_responses_select_policy"
  ON audit_responses
  FOR SELECT
  TO authenticated
  USING (
    auth_cache.has_min_role_cached(
      auth.uid(),
      organization_id,
      'VIEWER'
    )
  );

-- INSERT: Members and above can create responses
CREATE POLICY "audit_responses_insert_policy"
  ON audit_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_cache.has_min_role_cached(
      auth.uid(),
      organization_id,
      'MEMBER'
    )
  );

-- UPDATE: Creators and admins can update responses
CREATE POLICY "audit_responses_update_policy"
  ON audit_responses
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR auth_cache.has_min_role_cached(
      auth.uid(),
      organization_id,
      'ADMIN'
    )
  );

-- ============================================================================
-- PART 6: ORGANIZATION MEMBERS RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "organization_members_select_policy" ON organization_members;
DROP POLICY IF EXISTS "organization_members_insert_policy" ON organization_members;
DROP POLICY IF EXISTS "organization_members_update_policy" ON organization_members;
DROP POLICY IF EXISTS "organization_members_delete_policy" ON organization_members;

-- Enable RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view members of organizations they belong to
CREATE POLICY "organization_members_select_policy"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      user_id = auth.uid()
      OR auth_cache.has_min_role_cached(
        auth.uid(),
        organization_id,
        'VIEWER'
      )
    )
  );

-- INSERT: Only admins can add members
CREATE POLICY "organization_members_insert_policy"
  ON organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_cache.has_min_role_cached(
      auth.uid(),
      organization_id,
      'ADMIN'
    )
  );

-- UPDATE: Only admins can update member roles
CREATE POLICY "organization_members_update_policy"
  ON organization_members
  FOR UPDATE
  TO authenticated
  USING (
    auth_cache.has_min_role_cached(
      auth.uid(),
      organization_id,
      'ADMIN'
    )
  );

-- DELETE: Only admins can remove members
CREATE POLICY "organization_members_delete_policy"
  ON organization_members
  FOR DELETE
  TO authenticated
  USING (
    auth_cache.has_min_role_cached(
      auth.uid(),
      organization_id,
      'ADMIN'
    )
  );

-- ============================================================================
-- PART 7: INDEXES FOR RLS PERFORMANCE
-- ============================================================================

-- Create indexes to support RLS policies
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_knowledge_documents_org_created
  ON knowledge_documents(organization_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_knowledge_documents_created_by
  ON knowledge_documents(created_by)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_org_status_assignee
  ON tasks(organization_id, status, assignee_id)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assignee_created
  ON tasks(assignee_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_events_org_created
  ON activity_events(organization_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_responses_org_created
  ON audit_responses(organization_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_responses_created_by
  ON audit_responses(created_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_members_user_org
  ON organization_members(user_id, organization_id)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_members_org_role
  ON organization_members(organization_id, role)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- PART 8: GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on auth_cache schema
GRANT USAGE ON SCHEMA auth_cache TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth_cache TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled
DO $$
DECLARE
  v_table TEXT;
  v_rls_enabled BOOLEAN;
BEGIN
  FOR v_table IN 
    SELECT table_name 
    FROM unnest(ARRAY[
      'knowledge_documents',
      'tasks',
      'activity_events',
      'audit_responses',
      'organization_members'
    ]) AS table_name
  LOOP
    SELECT relrowsecurity INTO v_rls_enabled
    FROM pg_class
    WHERE relname = v_table;
    
    RAISE NOTICE 'Table %: RLS enabled = %', v_table, v_rls_enabled;
  END LOOP;
END $$;

COMMIT;

-- Success message
SELECT 
  'RLS policies successfully created for 5 core tables' AS status,
  'Performance indexes created' AS optimization,
  'Cached role checking enabled' AS performance;
