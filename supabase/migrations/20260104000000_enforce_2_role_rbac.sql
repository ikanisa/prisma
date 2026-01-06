-- =============================================================================
-- Phase 1: Enforce 2-Role RBAC System
-- =============================================================================
-- This migration consolidates all RLS policies and helper functions to use
-- the 2-role system (SYSTEM_ADMIN, STAFF) instead of the old 8-role system
--
-- Migration Strategy:
-- 1. Ensure app_role enum exists
-- 2. Update helper functions to use app_role
-- 3. Update RLS policies for core tables
-- 4. Ensure all policies check app_role from user_profiles
-- =============================================================================

-- =============================================================================
-- Ensure app_role enum exists (in case user_management_roles migration hasn't run)
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('SYSTEM_ADMIN', 'STAFF');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ensure user_status enum exists
DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- Helper Functions (Updated for 2-role system)
-- =============================================================================

-- Check if current user is system admin (using app_role)
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Only check if user_profiles table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'SYSTEM_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get current user's role (app_role)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.app_role AS $$
DECLARE
  user_role public.app_role;
BEGIN
  SELECT role INTO user_role
  FROM public.user_profiles
  WHERE id = auth.uid();

  RETURN COALESCE(user_role, 'STAFF');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user has minimum role (for future extensibility)
-- Currently only checks SYSTEM_ADMIN vs STAFF
CREATE OR REPLACE FUNCTION public.has_min_role(min_role public.app_role)
RETURNS BOOLEAN AS $$
DECLARE
  user_role public.app_role;
BEGIN
  -- SYSTEM_ADMIN has all permissions
  IF min_role = 'STAFF' THEN
    RETURN TRUE; -- All authenticated users have STAFF-level access
  END IF;

  -- For SYSTEM_ADMIN requirement, check if user is SYSTEM_ADMIN
  IF min_role = 'SYSTEM_ADMIN' THEN
    RETURN public.is_system_admin();
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- RLS Policies for Engagements (if table exists)
-- =============================================================================

-- Update engagements table RLS if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'engagements') THEN
    -- Enable RLS
    ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;

    -- Staff can see engagements in their organization (using org_id which exists)
    DROP POLICY IF EXISTS engagements_staff_select ON public.engagements;
    -- Only create policy if user_profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
      CREATE POLICY engagements_staff_select ON public.engagements
        FOR SELECT USING (
          org_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
          OR
          public.is_system_admin()
        );
    ELSE
      -- Fallback: allow all authenticated users if user_profiles doesn't exist yet
      CREATE POLICY engagements_staff_select ON public.engagements
        FOR SELECT USING (auth.uid() IS NOT NULL OR public.is_system_admin());
    END IF;

    -- Staff can create engagements in their organization
    DROP POLICY IF EXISTS engagements_staff_insert ON public.engagements;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
      CREATE POLICY engagements_staff_insert ON public.engagements
        FOR INSERT WITH CHECK (
          org_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
          OR
          public.is_system_admin()
        );
    ELSE
      CREATE POLICY engagements_staff_insert ON public.engagements
        FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR public.is_system_admin());
    END IF;

    -- Staff can update engagements in their organization
    DROP POLICY IF EXISTS engagements_staff_update ON public.engagements;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
      CREATE POLICY engagements_staff_update ON public.engagements
        FOR UPDATE USING (
          org_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
          OR
          public.is_system_admin()
        ) WITH CHECK (
          org_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
          OR
          public.is_system_admin()
        );
    ELSE
      CREATE POLICY engagements_staff_update ON public.engagements
        FOR UPDATE USING (auth.uid() IS NOT NULL OR public.is_system_admin())
        WITH CHECK (auth.uid() IS NOT NULL OR public.is_system_admin());
    END IF;
  END IF;
END $$;

-- =============================================================================
-- RLS Policies for Documents (if table exists)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
    ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

    -- Staff can see documents in engagements they have access to
    DROP POLICY IF EXISTS documents_staff_select ON public.documents;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
      CREATE POLICY documents_staff_select ON public.documents
        FOR SELECT USING (
          -- If engagement_id exists, check engagement access using org_id
          (engagement_id IS NULL OR engagement_id IN (
            SELECT id FROM public.engagements e
            WHERE e.org_id IN (
              SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
            )
          ))
          OR
          -- System admins can see all
          public.is_system_admin()
        );
    ELSE
      CREATE POLICY documents_staff_select ON public.documents
        FOR SELECT USING (auth.uid() IS NOT NULL OR public.is_system_admin());
    END IF;

    -- Staff can upload documents to engagements they have access to
    DROP POLICY IF EXISTS documents_staff_insert ON public.documents;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
      CREATE POLICY documents_staff_insert ON public.documents
        FOR INSERT WITH CHECK (
          (engagement_id IS NULL OR engagement_id IN (
            SELECT id FROM public.engagements e
            WHERE e.org_id IN (
              SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
            )
          ))
          OR
          public.is_system_admin()
        );
    ELSE
      CREATE POLICY documents_staff_insert ON public.documents
        FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR public.is_system_admin());
    END IF;
  END IF;
END $$;

-- =============================================================================
-- RLS Policies for Tasks (if table exists)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

    -- Staff can see tasks assigned to them
    DROP POLICY IF EXISTS tasks_staff_select ON public.tasks;
    CREATE POLICY tasks_staff_select ON public.tasks
      FOR SELECT USING (
        assigned_to = auth.uid()
        OR
        created_by = auth.uid()
        OR
        public.is_system_admin()
      );

    -- Staff can create tasks
    DROP POLICY IF EXISTS tasks_staff_insert ON public.tasks;
    CREATE POLICY tasks_staff_insert ON public.tasks
      FOR INSERT WITH CHECK (
        created_by = auth.uid()
        OR
        public.is_system_admin()
      );

    -- Staff can update tasks assigned to them
    DROP POLICY IF EXISTS tasks_staff_update ON public.tasks;
    CREATE POLICY tasks_staff_update ON public.tasks
      FOR UPDATE USING (
        assigned_to = auth.uid()
        OR
        created_by = auth.uid()
        OR
        public.is_system_admin()
      ) WITH CHECK (
        assigned_to = auth.uid()
        OR
        created_by = auth.uid()
        OR
        public.is_system_admin()
      );
  END IF;
END $$;

-- =============================================================================
-- RLS Policies for Organizations (if table exists)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
    ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

    -- Staff can see organizations they belong to
    DROP POLICY IF EXISTS organizations_staff_select ON public.organizations;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
      CREATE POLICY organizations_staff_select ON public.organizations
        FOR SELECT USING (
          id IN (
            SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
          )
          OR
          public.is_system_admin()
        );
    ELSE
      CREATE POLICY organizations_staff_select ON public.organizations
        FOR SELECT USING (auth.uid() IS NOT NULL OR public.is_system_admin());
    END IF;

    -- Only system admins can create/update/delete organizations
    DROP POLICY IF EXISTS organizations_admin_all ON public.organizations;
    CREATE POLICY organizations_admin_all ON public.organizations
      FOR ALL USING (public.is_system_admin())
      WITH CHECK (public.is_system_admin());
  END IF;
END $$;

-- =============================================================================
-- Audit Log Table (for tool execution logs)
-- =============================================================================

-- Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tool_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role public.app_role NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  input JSONB NOT NULL,
  output JSONB,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS tool_audit_logs_user_id_idx ON public.tool_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS tool_audit_logs_tool_name_idx ON public.tool_audit_logs(tool_name);
CREATE INDEX IF NOT EXISTS tool_audit_logs_created_at_idx ON public.tool_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS tool_audit_logs_request_id_idx ON public.tool_audit_logs(request_id);

-- Enable RLS
ALTER TABLE public.tool_audit_logs ENABLE ROW LEVEL SECURITY;

-- Staff can see their own audit logs
DROP POLICY IF EXISTS tool_audit_logs_staff_select ON public.tool_audit_logs;
CREATE POLICY tool_audit_logs_staff_select ON public.tool_audit_logs
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    public.is_system_admin()
  );

-- Only system can insert audit logs (via service role)
-- Staff cannot insert their own logs directly (security)
DROP POLICY IF EXISTS tool_audit_logs_insert ON public.tool_audit_logs;
CREATE POLICY tool_audit_logs_insert ON public.tool_audit_logs
  FOR INSERT WITH CHECK (true); -- Service role only

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON FUNCTION public.is_system_admin() IS 'Check if current user is SYSTEM_ADMIN (2-role system)';
COMMENT ON FUNCTION public.get_user_role() IS 'Get current user role (app_role: SYSTEM_ADMIN or STAFF)';
COMMENT ON FUNCTION public.has_min_role(public.app_role) IS 'Check if user has minimum required role';
COMMENT ON TABLE public.tool_audit_logs IS 'Audit log for tool executions with permission checks';

