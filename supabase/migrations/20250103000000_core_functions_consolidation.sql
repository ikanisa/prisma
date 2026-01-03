-- ============================================================================
-- Core Functions Consolidation Migration
-- ============================================================================
-- Purpose: Create single authoritative definitions for core RLS and utility functions
-- Date: 2025-01-03
-- Risk Level: LOW (CREATE OR REPLACE is idempotent and safe)
-- 
-- This migration consolidates 17+ duplicate function definitions into
-- single, well-documented, authoritative implementations.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CURRENT USER ID FUNCTION
-- ============================================================================
-- Simple wrapper around auth.uid() for consistency
-- Usage: SELECT current_user_id();
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

COMMENT ON FUNCTION public.current_user_id() IS 
'Returns the UUID of the currently authenticated user. Wrapper around auth.uid() for consistency.';

-- ============================================================================
-- 2. TOUCH UPDATED AT TRIGGER FUNCTION
-- ============================================================================
-- Standard trigger function to update updated_at timestamp
-- Usage: CREATE TRIGGER ... BEFORE UPDATE ... EXECUTE FUNCTION touch_updated_at();
-- ============================================================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.touch_updated_at() IS 
'Trigger function to automatically update the updated_at column on table updates. Use with: CREATE TRIGGER ... BEFORE UPDATE ... EXECUTE FUNCTION touch_updated_at();';

-- ============================================================================
-- 3. IS MEMBER OF FUNCTION
-- ============================================================================
-- Check if current user is a member of the specified organization
-- Usage: SELECT is_member_of(org_id);
-- Returns: BOOLEAN
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_member_of(org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.memberships m
    WHERE m.org_id = org_id 
      AND m.user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_member_of(UUID) IS 
'Returns TRUE if the current user is a member of the specified organization. Used extensively in RLS policies.';

-- ============================================================================
-- 4. HAS MIN ROLE FUNCTION (Unified Implementation)
-- ============================================================================
-- Check if current user has minimum required role in organization
-- Supports both org_role and legacy role_level enums
-- Usage: SELECT has_min_role(org_id, 'MANAGER'::org_role);
-- Returns: BOOLEAN
-- ============================================================================

-- Primary function using org_role (recommended)
CREATE OR REPLACE FUNCTION public.has_min_role(org_id UUID, min_role public.org_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH current_user_role AS (
    SELECT 
      m.role,
      CASE m.role
        WHEN 'SYSTEM_ADMIN' THEN 100
        WHEN 'PARTNER' THEN 90
        WHEN 'EQR' THEN 85
        WHEN 'MANAGER' THEN 70
        WHEN 'SERVICE_ACCOUNT' THEN 45
        WHEN 'EMPLOYEE' THEN 40
        WHEN 'CLIENT' THEN 30
        WHEN 'READONLY' THEN 20
        ELSE 0
      END AS precedence
    FROM public.memberships m
    WHERE m.org_id = org_id 
      AND m.user_id = auth.uid()
    ORDER BY m.created_at DESC
    LIMIT 1
  ),
  required_role AS (
    SELECT CASE min_role
      WHEN 'SYSTEM_ADMIN' THEN 100
      WHEN 'PARTNER' THEN 90
      WHEN 'EQR' THEN 85
      WHEN 'MANAGER' THEN 70
      WHEN 'SERVICE_ACCOUNT' THEN 45
      WHEN 'EMPLOYEE' THEN 40
      WHEN 'CLIENT' THEN 30
      WHEN 'READONLY' THEN 20
      ELSE 0
    END AS precedence
  )
  SELECT COALESCE(
    (SELECT cur.precedence >= rr.precedence 
     FROM current_user_role cur, required_role rr),
    false
  );
$$;

COMMENT ON FUNCTION public.has_min_role(UUID, public.org_role) IS 
'Returns TRUE if the current user has at least the minimum required role in the organization. Uses org_role enum. Role hierarchy: SYSTEM_ADMIN > PARTNER > EQR > MANAGER > SERVICE_ACCOUNT > EMPLOYEE > CLIENT > READONLY';

-- Backward compatibility: Support legacy role_level enum
CREATE OR REPLACE FUNCTION public.has_min_role(org_id UUID, min_role public.role_level)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Map role_level to org_role and call primary function
  SELECT public.has_min_role(org_id, CASE min_role
    WHEN 'SYSTEM_ADMIN' THEN 'SYSTEM_ADMIN'::public.org_role
    WHEN 'MANAGER' THEN 'MANAGER'::public.org_role
    WHEN 'EMPLOYEE' THEN 'EMPLOYEE'::public.org_role
    ELSE 'EMPLOYEE'::public.org_role
  END);
$$;

COMMENT ON FUNCTION public.has_min_role(UUID, public.role_level) IS 
'Legacy compatibility function for role_level enum. Maps to org_role and calls primary function. DEPRECATED: Use org_role version instead.';

-- ============================================================================
-- 5. HANDLE NEW USER TRIGGER FUNCTION
-- ============================================================================
-- Trigger function to create user record when new auth user is created
-- Usage: CREATE TRIGGER ... AFTER INSERT ON auth.users ... EXECUTE FUNCTION handle_new_user();
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 
'Trigger function to automatically create a user record in public.users when a new auth.users record is created. Extracts name from user metadata.';

COMMIT;

-- ============================================================================
-- Migration Notes:
-- ============================================================================
-- 1. All functions use CREATE OR REPLACE, so this migration is idempotent
-- 2. Functions are SECURITY DEFINER to ensure proper permissions
-- 3. search_path is explicitly set to public for security
-- 4. Backward compatibility maintained for role_level enum
-- 5. All functions are STABLE for query optimization
-- 6. Comprehensive documentation via COMMENT statements
-- ============================================================================

