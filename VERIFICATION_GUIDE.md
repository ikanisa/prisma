# Function Consolidation Verification Guide

**Date:** 2025-01-03  
**Status:** Ready for Verification

---

## Overview

This guide provides step-by-step instructions to verify that the consolidated functions are correctly deployed and working as expected.

---

## Verification Steps

### Step 1: Check Migration Status

Verify that the migration is deployed:

```bash
supabase migration list --linked | grep 20250103
```

**Expected Output:**
```
   Local          | Remote         | Time (UTC)          
   20250103000000 | 20250103000000 | 2025-01-03 00:00:00 
```

Both Local and Remote should show the same migration version.

---

### Step 2: Verify Functions Exist

#### Option A: Using SQL Script (Recommended)

Run the verification SQL script in Supabase SQL Editor:

```bash
# Open verify_functions.sql in Supabase SQL Editor and execute
```

Or via CLI:

```bash
supabase db execute --linked --file verify_functions.sql
```

#### Option B: Manual SQL Query

```sql
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type,
  prosecdef as is_security_definer
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
ORDER BY proname;
```

**Expected Functions:**
1. `current_user_id()` - Returns UUID
2. `touch_updated_at()` - Returns TRIGGER
3. `is_member_of(org uuid)` - Returns BOOLEAN
4. `has_min_role(org uuid, min role_level)` - Returns BOOLEAN
5. `handle_new_user()` - Returns TRIGGER

---

### Step 3: Test Function Execution

#### Test current_user_id()

```sql
-- Should return NULL if not authenticated, or UUID if authenticated
SELECT public.current_user_id();
```

**Expected:** Returns NULL (if not authenticated) or UUID (if authenticated)

#### Test is_member_of()

```sql
-- Test with a non-existent org (should return false)
SELECT public.is_member_of('00000000-0000-0000-0000-000000000000'::uuid);

-- Test with an actual org_id from your database
-- SELECT public.is_member_of('<actual-org-id>'::uuid);
```

**Expected:** Returns `false` (if not authenticated/not member) or `true` (if member)

#### Test has_min_role()

```sql
-- Test with a non-existent org (should return false)
SELECT public.has_min_role(
  '00000000-0000-0000-0000-000000000000'::uuid, 
  'EMPLOYEE'::public.role_level
);

-- Test with actual org_id and role
-- SELECT public.has_min_role('<actual-org-id>'::uuid, 'MANAGER'::public.role_level);
```

**Expected:** Returns `false` (if not authenticated/not member) or `true` (if has required role)

---

### Step 4: Verify RLS Policies

#### Check RLS Policies Using Functions

```sql
-- Run verify_rls_policies.sql or execute:
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies
WHERE (qual::text LIKE '%is_member_of%' 
   OR qual::text LIKE '%has_min_role%'
   OR qual::text LIKE '%current_user_id%')
ORDER BY schemaname, tablename, policyname;
```

**What to Check:**
- Policies reference functions correctly
- No syntax errors in policy definitions
- Functions are called with correct parameters

#### Verify RLS is Enabled

```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'organizations', 'memberships', 'clients', 'engagements')
ORDER BY tablename;
```

**Expected:** `rls_enabled = true` for all security-sensitive tables

---

### Step 5: Test Application Functionality

#### Authentication Flow

1. **User Registration**
   - Create a new user account
   - Verify `handle_new_user()` trigger creates corresponding `public.users` record
   - Check that user record is created correctly

2. **User Login**
   - Log in with existing credentials
   - Verify `current_user_id()` returns correct UUID
   - Check that user can access their own data

#### Organization Access Control

1. **Organization Membership**
   - Create or access an organization
   - Verify `is_member_of()` works correctly
   - Test that users can only see organizations they're members of

2. **Role-Based Access**
   - Test different user roles (EMPLOYEE, MANAGER, SYSTEM_ADMIN)
   - Verify `has_min_role()` works correctly
   - Test that role hierarchy is enforced properly

#### Table Access

1. **Users Table**
   - Verify users can read their own records
   - Verify users cannot read other users' records (unless admin)

2. **Organizations Table**
   - Verify users can read organizations they're members of
   - Verify users cannot read organizations they're not members of

3. **Memberships Table**
   - Verify users can read their own memberships
   - Verify managers can read memberships in their organizations

---

### Step 6: Check Triggers

#### Verify touch_updated_at Trigger

```sql
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_triggerdef(t.oid) LIKE '%touch_updated_at%'
ORDER BY c.relname, t.tgname;
```

**Test:**
- Update a record in a table with `touch_updated_at` trigger
- Verify `updated_at` column is automatically updated

#### Verify handle_new_user Trigger

```sql
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth'
  AND c.relname = 'users'
  AND pg_get_triggerdef(t.oid) LIKE '%handle_new_user%';
```

**Test:**
- Create a new user in auth.users (via Supabase Auth)
- Verify corresponding record is created in public.users

---

## Verification Checklist

### Function Existence
- [ ] `current_user_id()` exists
- [ ] `touch_updated_at()` exists
- [ ] `is_member_of(org uuid)` exists
- [ ] `has_min_role(org uuid, min role_level)` exists
- [ ] `handle_new_user()` exists

### Function Properties
- [ ] All functions have SECURITY DEFINER set correctly
- [ ] All functions have search_path explicitly set
- [ ] All functions have documentation (COMMENT)

### Function Execution
- [ ] `current_user_id()` executes without errors
- [ ] `is_member_of()` executes without errors
- [ ] `has_min_role()` executes without errors

### RLS Policies
- [ ] RLS policies reference functions correctly
- [ ] RLS is enabled on critical tables
- [ ] Policies work as expected in application

### Triggers
- [ ] `touch_updated_at` triggers work correctly
- [ ] `handle_new_user` trigger works correctly

### Application Testing
- [ ] User authentication works
- [ ] Organization access control works
- [ ] Role-based permissions work
- [ ] No errors in application logs

---

## Troubleshooting

### Functions Not Found

If functions are not found:

1. **Check migration status:**
   ```bash
   supabase migration list --linked
   ```

2. **Check migration logs:**
   ```bash
   # Review deployment logs for errors
   ```

3. **Re-run migration (if needed):**
   ```bash
   supabase migration repair --status reverted 20250103000000 --linked
   supabase db push --linked
   ```

### Function Execution Errors

If functions execute with errors:

1. **Check function definition:**
   ```sql
   SELECT pg_get_functiondef(oid) 
   FROM pg_proc 
   WHERE proname = 'function_name';
   ```

2. **Check dependencies:**
   - Verify required tables exist
   - Verify required enums exist
   - Verify required extensions are installed

3. **Check permissions:**
   - Verify SECURITY DEFINER is set correctly
   - Verify search_path includes required schemas

### RLS Policy Issues

If RLS policies don't work:

1. **Verify RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
   ```

2. **Check policy definitions:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'table_name';
   ```

3. **Test policies manually:**
   - Test with authenticated user
   - Test with different roles
   - Check application logs for policy errors

---

## Files Reference

- `verify_functions.sql` - Comprehensive function verification queries
- `verify_rls_policies.sql` - RLS policy verification queries
- `verify_deployment.sh` - Automated verification script
- `VERIFICATION_GUIDE.md` - This guide

---

## Success Criteria

Verification is successful when:

1. ✅ All 5 consolidated functions exist and are accessible
2. ✅ Functions execute without errors
3. ✅ Functions have correct security settings (SECURITY DEFINER, search_path)
4. ✅ RLS policies work correctly
5. ✅ Triggers work correctly
6. ✅ Application functionality is not broken
7. ✅ No errors in application or database logs

---

**Next Steps:** After successful verification, proceed with:
- Migration cleanup (remove duplicate definitions from old migrations)
- Continue with other refactoring phases
- Monitor application performance

