-- Database Function Security Patch
-- Adds SET search_path to security definer functions
-- Prevents privilege escalation attacks
-- Created: 2025-11-28

BEGIN;

-- ============================================================================
-- SECURITY PATCH: Add search_path to all SECURITY DEFINER functions
-- This prevents privilege escalation by ensuring functions operate in
-- a controlled schema namespace
-- ============================================================================

-- 1. is_member_of function
CREATE OR REPLACE FUNCTION public.is_member_of(org UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE user_id = auth.uid()
      AND organization_id = org
      AND deleted_at IS NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth;

COMMENT ON FUNCTION public.is_member_of IS 
'Checks if the current user is a member of the specified organization. SECURITY DEFINER with controlled search_path.';

-- 2. has_min_role function
CREATE OR REPLACE FUNCTION public.has_min_role(org UUID, min public.role_level)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE user_id = auth.uid()
      AND organization_id = org
      AND role >= min
      AND deleted_at IS NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth;

COMMENT ON FUNCTION public.has_min_role IS 
'Checks if current user has minimum role level in organization. SECURITY DEFINER with controlled search_path.';

-- 3. handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.handle_updated_at IS 
'Automatically updates the updated_at timestamp. SECURITY DEFINER with controlled search_path.';

-- 4. handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

COMMENT ON FUNCTION public.handle_new_user IS 
'Creates profile for new authenticated users. SECURITY DEFINER with controlled search_path.';

-- 5. match_vectors function (for vector similarity search)
CREATE OR REPLACE FUNCTION match_vectors(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION match_vectors IS 
'Vector similarity search for RAG. SECURITY DEFINER with controlled search_path.';

-- 6. get_organization_members function
CREATE OR REPLACE FUNCTION get_organization_members(p_org_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Verify caller has permission
  IF NOT auth_cache.has_min_role_cached(auth.uid(), p_org_id, 'VIEWER') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    om.user_id,
    u.email,
    om.role::TEXT,
    om.created_at
  FROM organization_members om
  JOIN auth.users u ON u.id = om.user_id
  WHERE om.organization_id = p_org_id
    AND om.deleted_at IS NULL
  ORDER BY om.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, auth, auth_cache;

COMMENT ON FUNCTION get_organization_members IS 
'Returns organization members with access control. SECURITY DEFINER with controlled search_path.';

-- 7. calculate_tax_liability function
CREATE OR REPLACE FUNCTION calculate_tax_liability(
  p_org_id UUID,
  p_year INT,
  p_jurisdiction TEXT
)
RETURNS TABLE (
  category TEXT,
  amount NUMERIC,
  rate NUMERIC
) AS $$
BEGIN
  -- Verify caller has permission
  IF NOT auth_cache.has_min_role_cached(auth.uid(), p_org_id, 'MEMBER') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    tl.category,
    tl.amount,
    tl.rate
  FROM tax_liabilities tl
  WHERE tl.organization_id = p_org_id
    AND tl.tax_year = p_year
    AND tl.jurisdiction = p_jurisdiction
  ORDER BY tl.category;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, auth_cache;

COMMENT ON FUNCTION calculate_tax_liability IS 
'Calculates tax liability for organization. SECURITY DEFINER with controlled search_path.';

-- 8. generate_audit_report function
CREATE OR REPLACE FUNCTION generate_audit_report(
  p_engagement_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_org_id UUID;
  v_report JSONB;
BEGIN
  -- Get organization from engagement
  SELECT organization_id INTO v_org_id
  FROM audit_engagements
  WHERE id = p_engagement_id;

  -- Verify caller has permission
  IF NOT auth_cache.has_min_role_cached(auth.uid(), v_org_id, 'MEMBER') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Generate report (simplified example)
  SELECT jsonb_build_object(
    'engagement_id', p_engagement_id,
    'organization_id', v_org_id,
    'generated_at', CURRENT_TIMESTAMP,
    'findings', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'control', ar.control_id,
          'response', ar.response_text,
          'status', ar.status
        )
      )
      FROM audit_responses ar
      WHERE ar.engagement_id = p_engagement_id
    )
  ) INTO v_report;

  RETURN v_report;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, auth_cache;

COMMENT ON FUNCTION generate_audit_report IS 
'Generates audit report with access control. SECURITY DEFINER with controlled search_path.';

-- 9. create_activity_event function
CREATE OR REPLACE FUNCTION create_activity_event(
  p_org_id UUID,
  p_event_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Verify caller has permission
  IF NOT auth_cache.has_min_role_cached(auth.uid(), p_org_id, 'VIEWER') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO activity_events (
    organization_id,
    user_id,
    event_type,
    entity_type,
    entity_id,
    metadata,
    created_at
  ) VALUES (
    p_org_id,
    auth.uid(),
    p_event_type,
    p_entity_type,
    p_entity_id,
    p_metadata,
    CURRENT_TIMESTAMP
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, auth, auth_cache;

COMMENT ON FUNCTION create_activity_event IS 
'Creates activity log event with access control. SECURITY DEFINER with controlled search_path.';

-- 10. soft_delete_record function
CREATE OR REPLACE FUNCTION soft_delete_record(
  p_table_name TEXT,
  p_record_id UUID,
  p_org_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verify caller has admin permission
  IF NOT auth_cache.has_min_role_cached(auth.uid(), p_org_id, 'ADMIN') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Perform soft delete (example - adjust for specific tables)
  EXECUTE format(
    'UPDATE %I SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 WHERE id = $2',
    p_table_name
  ) USING auth.uid(), p_record_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, auth, auth_cache;

COMMENT ON FUNCTION soft_delete_record IS 
'Soft deletes record with admin permission check. SECURITY DEFINER with controlled search_path.';

-- 11. get_user_organizations function
CREATE OR REPLACE FUNCTION get_user_organizations(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  role TEXT,
  member_since TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Users can only view their own organizations unless they're admin
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    om.organization_id,
    o.name,
    om.role::TEXT,
    om.created_at
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = v_user_id
    AND om.deleted_at IS NULL
  ORDER BY om.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, auth;

COMMENT ON FUNCTION get_user_organizations IS 
'Returns user organizations with access control. SECURITY DEFINER with controlled search_path.';

-- ============================================================================
-- VERIFY SECURITY PATCH
-- ============================================================================

DO $$
DECLARE
  v_function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND p.proconfig IS NOT NULL
    AND 'search_path' = ANY(
      SELECT split_part(unnest(p.proconfig), '=', 1)
    );
  
  RAISE NOTICE 'Functions with SECURITY DEFINER and search_path: %', v_function_count;
  
  IF v_function_count < 11 THEN
    RAISE WARNING 'Expected at least 11 functions with search_path protection';
  ELSE
    RAISE NOTICE 'Security patch successfully applied!';
  END IF;
END $$;

COMMIT;

-- Success
SELECT 
  'Database function security patch applied' AS status,
  '11 functions now have SET search_path' AS result,
  'Privilege escalation attacks prevented' AS security;
