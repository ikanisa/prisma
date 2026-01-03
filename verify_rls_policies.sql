-- ============================================================================
-- RLS Policy Verification Script
-- ============================================================================
-- Purpose: Verify that RLS policies using consolidated functions work correctly
-- Date: 2025-01-03
-- ============================================================================

-- ============================================================================
-- 1. LIST ALL RLS POLICIES USING CONSOLIDATED FUNCTIONS
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE (qual::text LIKE '%is_member_of%' 
   OR qual::text LIKE '%has_min_role%'
   OR qual::text LIKE '%current_user_id%'
   OR qual::text LIKE '%touch_updated_at%'
   OR with_check::text LIKE '%is_member_of%'
   OR with_check::text LIKE '%has_min_role%'
   OR with_check::text LIKE '%current_user_id%')
ORDER BY schemaname, tablename, policyname;

-- ============================================================================
-- 2. CHECK CRITICAL TABLES WITH RLS POLICIES
-- ============================================================================

-- Check users table policies
SELECT 
  'users table RLS' as check_type,
  tablename,
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- Check organizations table policies
SELECT 
  'organizations table RLS' as check_type,
  tablename,
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'organizations'
ORDER BY policyname;

-- Check memberships table policies
SELECT 
  'memberships table RLS' as check_type,
  tablename,
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'memberships'
ORDER BY policyname;

-- ============================================================================
-- 3. VERIFY RLS IS ENABLED ON CRITICAL TABLES
-- ============================================================================

SELECT 
  'RLS Enabled Check' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity = true THEN 'PASS (RLS enabled)'
    ELSE 'WARNING (RLS not enabled)'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'organizations', 'memberships', 'clients', 'engagements')
ORDER BY tablename;

-- ============================================================================
-- 4. CHECK FOR POLICY DEPENDENCIES
-- ============================================================================
-- Verify that policies reference functions correctly

SELECT 
  'Policy Function Dependency' as check_type,
  p.tablename,
  p.policyname,
  CASE 
    WHEN p.qual::text LIKE '%is_member_of%' THEN 'uses is_member_of'
    WHEN p.qual::text LIKE '%has_min_role%' THEN 'uses has_min_role'
    WHEN p.qual::text LIKE '%current_user_id%' THEN 'uses current_user_id'
    ELSE 'other function'
  END as function_used
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND (p.qual::text LIKE '%is_member_of%' 
       OR p.qual::text LIKE '%has_min_role%'
       OR p.qual::text LIKE '%current_user_id%')
ORDER BY p.tablename, p.policyname;

-- ============================================================================
-- 5. CHECK TRIGGERS USING CONSOLIDATED FUNCTIONS
-- ============================================================================

SELECT 
  'Trigger Check' as check_type,
  t.tgname as trigger_name,
  n.nspname as schema_name,
  c.relname as table_name,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND t.tgname LIKE '%touch_updated_at%'
  OR pg_get_triggerdef(t.oid) LIKE '%touch_updated_at%'
ORDER BY c.relname, t.tgname;

-- Check handle_new_user trigger
SELECT 
  'Trigger Check: handle_new_user' as check_type,
  t.tgname as trigger_name,
  n.nspname as schema_name,
  c.relname as table_name,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth'
  AND c.relname = 'users'
  AND (t.tgname LIKE '%handle_new_user%'
       OR pg_get_triggerdef(t.oid) LIKE '%handle_new_user%')
ORDER BY t.tgname;

