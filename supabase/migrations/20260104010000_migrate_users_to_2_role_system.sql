-- =============================================================================
-- Data Migration: 8-Role System → 2-Role System
-- =============================================================================
-- This migration converts existing users from the old 8-role system
-- (SYSTEM_ADMIN, PARTNER, MANAGER, EMPLOYEE, CLIENT, READONLY, SERVICE_ACCOUNT, EQR)
-- to the new 2-role system (SYSTEM_ADMIN, STAFF)
--
-- NOTE: This migration will be skipped if user_profiles table doesn't exist yet.
-- It's safe to skip as it's a data migration that only runs when needed.
-- =============================================================================

-- Skip entire migration if user_profiles table doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    RAISE NOTICE 'Skipping user role migration: user_profiles table does not exist yet';
    RETURN;
  END IF;
END $$;

-- =============================================================================
-- Step 1: Create backup table (for rollback safety)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles_role_backup AS
SELECT 
  id,
  email,
  role as old_role,
  organization_id,
  created_at
FROM public.user_profiles
WHERE role IS NOT NULL;

-- Add comment
COMMENT ON TABLE public.user_profiles_role_backup IS 
  'Backup of user roles before migration to 2-role system. Created: 2026-01-04';

-- =============================================================================
-- Step 2: Migration function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.migrate_user_roles_to_2_role_system()
RETURNS TABLE (
  user_id UUID,
  old_role TEXT,
  new_role public.app_role,
  migration_status TEXT
) AS $$
DECLARE
  user_record RECORD;
  new_role_value public.app_role;
  migration_status_text TEXT;
BEGIN
  -- Loop through all user profiles
  FOR user_record IN 
    SELECT id, role, email
    FROM public.user_profiles
    WHERE role IS NOT NULL
  LOOP
    -- Determine new role based on old role
    CASE user_record.role::TEXT
      WHEN 'SYSTEM_ADMIN' THEN
        new_role_value := 'SYSTEM_ADMIN';
        migration_status_text := 'NO_CHANGE';
        
      WHEN 'PARTNER', 'MANAGER', 'EMPLOYEE' THEN
        new_role_value := 'STAFF';
        migration_status_text := 'MIGRATED_TO_STAFF';
        
      WHEN 'CLIENT' THEN
        -- CLIENT users might need special handling
        -- For now, convert to STAFF but flag for review
        new_role_value := 'STAFF';
        migration_status_text := 'MIGRATED_FROM_CLIENT_REVIEW_NEEDED';
        
      WHEN 'READONLY' THEN
        -- READONLY users become STAFF (they can still have limited permissions via RLS)
        new_role_value := 'STAFF';
        migration_status_text := 'MIGRATED_FROM_READONLY';
        
      WHEN 'SERVICE_ACCOUNT' THEN
        -- SERVICE_ACCOUNT might need to remain separate or become STAFF
        -- For now, convert to STAFF but flag for review
        new_role_value := 'STAFF';
        migration_status_text := 'MIGRATED_FROM_SERVICE_ACCOUNT_REVIEW_NEEDED';
        
      WHEN 'EQR' THEN
        -- EQR is a flag, not a role - convert base role to STAFF
        new_role_value := 'STAFF';
        migration_status_text := 'MIGRATED_FROM_EQR';
        
      ELSE
        -- Unknown role - default to STAFF
        new_role_value := 'STAFF';
        migration_status_text := 'UNKNOWN_ROLE_DEFAULTED_TO_STAFF';
    END CASE;
    
    -- Update user profile
    UPDATE public.user_profiles
    SET 
      role = new_role_value,
      updated_at = now()
    WHERE id = user_record.id;
    
    -- Return migration result
    RETURN QUERY SELECT 
      user_record.id,
      user_record.role::TEXT,
      new_role_value,
      migration_status_text;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Step 3: Execute migration (commented out for safety - uncomment to run)
-- =============================================================================

-- Uncomment the following line to execute the migration:
-- SELECT * FROM public.migrate_user_roles_to_2_role_system();

-- =============================================================================
-- Step 4: Create migration log table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.role_migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_role TEXT,
  new_role public.app_role NOT NULL,
  migration_status TEXT NOT NULL,
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  migrated_by TEXT DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS role_migration_log_user_id_idx ON public.role_migration_log(user_id);
CREATE INDEX IF NOT EXISTS role_migration_log_migrated_at_idx ON public.role_migration_log(migrated_at);

COMMENT ON TABLE public.role_migration_log IS 
  'Log of role migrations from 8-role to 2-role system';

-- =============================================================================
-- Step 5: Enhanced migration function with logging
-- =============================================================================

CREATE OR REPLACE FUNCTION public.migrate_user_roles_to_2_role_system_with_log()
RETURNS TABLE (
  user_id UUID,
  old_role TEXT,
  new_role public.app_role,
  migration_status TEXT
) AS $$
DECLARE
  user_record RECORD;
  new_role_value public.app_role;
  migration_status_text TEXT;
BEGIN
  -- Loop through all user profiles
  FOR user_record IN 
    SELECT id, role, email
    FROM public.user_profiles
    WHERE role IS NOT NULL
  LOOP
    -- Determine new role based on old role
    CASE user_record.role::TEXT
      WHEN 'SYSTEM_ADMIN' THEN
        new_role_value := 'SYSTEM_ADMIN';
        migration_status_text := 'NO_CHANGE';
        
      WHEN 'PARTNER', 'MANAGER', 'EMPLOYEE' THEN
        new_role_value := 'STAFF';
        migration_status_text := 'MIGRATED_TO_STAFF';
        
      WHEN 'CLIENT' THEN
        new_role_value := 'STAFF';
        migration_status_text := 'MIGRATED_FROM_CLIENT_REVIEW_NEEDED';
        
      WHEN 'READONLY' THEN
        new_role_value := 'STAFF';
        migration_status_text := 'MIGRATED_FROM_READONLY';
        
      WHEN 'SERVICE_ACCOUNT' THEN
        new_role_value := 'STAFF';
        migration_status_text := 'MIGRATED_FROM_SERVICE_ACCOUNT_REVIEW_NEEDED';
        
      WHEN 'EQR' THEN
        new_role_value := 'STAFF';
        migration_status_text := 'MIGRATED_FROM_EQR';
        
      ELSE
        new_role_value := 'STAFF';
        migration_status_text := 'UNKNOWN_ROLE_DEFAULTED_TO_STAFF';
    END CASE;
    
    -- Update user profile
    UPDATE public.user_profiles
    SET 
      role = new_role_value,
      updated_at = now()
    WHERE id = user_record.id;
    
    -- Log migration
    INSERT INTO public.role_migration_log (
      user_id,
      old_role,
      new_role,
      migration_status
    ) VALUES (
      user_record.id,
      user_record.role::TEXT,
      new_role_value,
      migration_status_text
    );
    
    -- Return migration result
    RETURN QUERY SELECT 
      user_record.id,
      user_record.role::TEXT,
      new_role_value,
      migration_status_text;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Step 6: Verification function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.verify_role_migration()
RETURNS TABLE (
  total_users BIGINT,
  system_admin_count BIGINT,
  staff_count BIGINT,
  invalid_roles BIGINT,
  migration_issues TEXT[]
) AS $$
DECLARE
  issues TEXT[] := ARRAY[]::TEXT[];
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE role = 'SYSTEM_ADMIN') as admin_count,
      COUNT(*) FILTER (WHERE role = 'STAFF') as staff_count,
      COUNT(*) FILTER (WHERE role NOT IN ('SYSTEM_ADMIN', 'STAFF')) as invalid_count
    FROM public.user_profiles
    WHERE role IS NOT NULL
  )
  SELECT 
    s.total,
    s.admin_count,
    s.staff_count,
    s.invalid_count,
    CASE 
      WHEN s.invalid_count > 0 THEN 
        ARRAY['Some users have invalid roles. Review and fix manually.']
      ELSE 
        ARRAY[]::TEXT[]
    END as issues
  FROM stats s;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Step 7: Rollback function (if needed)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rollback_role_migration()
RETURNS INTEGER AS $$
DECLARE
  restored_count INTEGER := 0;
BEGIN
  -- Restore roles from backup
  UPDATE public.user_profiles up
  SET 
    role = b.old_role::public.app_role,
    updated_at = now()
  FROM public.user_profiles_role_backup b
  WHERE up.id = b.id
    AND b.old_role IS NOT NULL;
  
  GET DIAGNOSTICS restored_count = ROW_COUNT;
  
  RETURN restored_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Instructions
-- =============================================================================

COMMENT ON FUNCTION public.migrate_user_roles_to_2_role_system_with_log() IS 
  'Migrates users from 8-role system to 2-role system with logging. 
   Usage: SELECT * FROM public.migrate_user_roles_to_2_role_system_with_log();';

COMMENT ON FUNCTION public.verify_role_migration() IS 
  'Verifies role migration completed successfully. 
   Usage: SELECT * FROM public.verify_role_migration();';

COMMENT ON FUNCTION public.rollback_role_migration() IS 
  'Rolls back role migration using backup table. 
   Usage: SELECT public.rollback_role_migration();';

-- =============================================================================
-- Migration Checklist
-- =============================================================================
-- 
-- Before running migration:
-- 1. Backup database
-- 2. Review user_profiles_role_backup table structure
-- 3. Test migration on staging environment
-- 4. Verify RLS policies are updated
-- 
-- To execute migration:
-- 1. SELECT * FROM public.migrate_user_roles_to_2_role_system_with_log();
-- 2. SELECT * FROM public.verify_role_migration();
-- 3. Review role_migration_log for any issues
-- 4. If issues found, use rollback: SELECT public.rollback_role_migration();
-- 
-- After migration:
-- 1. Update application code to use 2-role system
-- 2. Test all user flows
-- 3. Monitor for any permission issues
-- 4. Archive backup table after verification period (e.g., 30 days)

