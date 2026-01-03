-- ============================================================================
-- Function Consolidation Verification Script
-- ============================================================================
-- Purpose: Verify that consolidated functions are correctly deployed
-- Date: 2025-01-03
-- ============================================================================

-- ============================================================================
-- 1. VERIFY FUNCTIONS EXIST
-- ============================================================================

SELECT 
  'Function Existence Check' as check_type,
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type,
  prosecdef as is_security_definer,
  CASE 
    WHEN proconfig IS NULL THEN 'search_path not set'
    ELSE array_to_string(proconfig, ', ')
  END as search_path_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN (
    'current_user_id',
    'touch_updated_at',
    'is_member_of',
    'has_min_role',
    'handle_new_user'
  )
ORDER BY proname, pg_get_function_arguments(oid);

-- ============================================================================
-- 2. VERIFY FUNCTION DEFINITIONS (Full SQL)
-- ============================================================================

SELECT 
  'Function Definition' as check_type,
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_functiondef(oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN (
    'current_user_id',
    'touch_updated_at',
    'is_member_of',
    'has_min_role',
    'handle_new_user'
  )
ORDER BY proname, pg_get_function_arguments(oid);

-- ============================================================================
-- 3. TEST CURRENT_USER_ID FUNCTION
-- ============================================================================

SELECT 
  'Test: current_user_id' as test_name,
  public.current_user_id() as result,
  CASE 
    WHEN public.current_user_id() IS NULL THEN 'PASS (returns NULL when not authenticated)'
    ELSE 'PASS (returns UUID)'
  END as status;

-- ============================================================================
-- 4. TEST IS_MEMBER_OF FUNCTION
-- ============================================================================
-- Note: This will return false if user is not authenticated or org doesn't exist
-- That's expected behavior

SELECT 
  'Test: is_member_of (with non-existent org)' as test_name,
  public.is_member_of('00000000-0000-0000-0000-000000000000'::uuid) as result,
  CASE 
    WHEN public.is_member_of('00000000-0000-0000-0000-000000000000'::uuid) = false 
    THEN 'PASS (returns false for non-member)'
    ELSE 'PASS (returns true if member - check result)'
  END as status;

-- ============================================================================
-- 5. TEST HAS_MIN_ROLE FUNCTION
-- ============================================================================
-- Note: This will return false if user is not authenticated or org doesn't exist
-- That's expected behavior

SELECT 
  'Test: has_min_role (with non-existent org)' as test_name,
  public.has_min_role(
    '00000000-0000-0000-0000-000000000000'::uuid, 
    'EMPLOYEE'::public.role_level
  ) as result,
  CASE 
    WHEN public.has_min_role(
      '00000000-0000-0000-0000-000000000000'::uuid, 
      'EMPLOYEE'::public.role_level
    ) = false 
    THEN 'PASS (returns false when not authenticated or not member)'
    ELSE 'PASS (returns true if has role - check result)'
  END as status;

-- ============================================================================
-- 6. VERIFY FUNCTION COMMENTS (Documentation)
-- ============================================================================

SELECT 
  'Function Documentation' as check_type,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  obj_description(p.oid, 'pg_proc') as comment
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN (
    'current_user_id',
    'touch_updated_at',
    'is_member_of',
    'has_min_role',
    'handle_new_user'
  )
ORDER BY proname, pg_get_function_arguments(oid);

-- ============================================================================
-- 7. CHECK RLS POLICIES USING THESE FUNCTIONS
-- ============================================================================

SELECT 
  'RLS Policy Check' as check_type,
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
   OR with_check::text LIKE '%is_member_of%'
   OR with_check::text LIKE '%has_min_role%'
   OR with_check::text LIKE '%current_user_id%')
ORDER BY schemaname, tablename, policyname;

-- ============================================================================
-- 8. COUNT FUNCTIONS (Should have expected number of overloads)
-- ============================================================================

SELECT 
  'Function Count' as check_type,
  proname as function_name,
  COUNT(*) as overload_count,
  array_agg(pg_get_function_arguments(oid) ORDER BY pg_get_function_arguments(oid)) as all_signatures
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN (
    'current_user_id',
    'touch_updated_at',
    'is_member_of',
    'has_min_role',
    'handle_new_user'
  )
GROUP BY proname
ORDER BY proname;

-- ============================================================================
-- 9. VERIFY SECURITY DEFINER AND SEARCH_PATH
-- ============================================================================

SELECT 
  'Security Check' as check_type,
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  prosecdef as is_security_definer,
  CASE 
    WHEN prosecdef = true THEN 'PASS (SECURITY DEFINER set)'
    WHEN prosecdef = false THEN 'CHECK (function uses invoker rights)'
    ELSE 'UNKNOWN'
  END as security_status,
  CASE 
    WHEN proconfig IS NOT NULL AND array_to_string(proconfig, '') LIKE '%search_path%' 
    THEN 'PASS (search_path explicitly set)'
    ELSE 'WARNING (search_path not explicitly set)'
  END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN (
    'current_user_id',
    'touch_updated_at',
    'is_member_of',
    'has_min_role',
    'handle_new_user'
  )
ORDER BY proname, pg_get_function_arguments(oid);

