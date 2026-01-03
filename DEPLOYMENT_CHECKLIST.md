# Deployment Checklist - Consolidation Migrations

**Date:** 2025-01-03  
**Migrations to Deploy:**
- `20250103000000_core_functions_consolidation.sql`
- `20250103000001_enums_consolidation.sql`

---

## Pre-Deployment Checklist

### ✅ Code Review
- [x] Migration files reviewed
- [x] Syntax validated
- [x] Documentation verified
- [x] Security best practices confirmed (SECURITY DEFINER, search_path)

### ⏳ Pre-Deployment Steps

- [ ] **Backup Database**
  ```bash
  # Create backup before deployment
  pg_dump "$DATABASE_URL" > backup_before_consolidation_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Verify Current State**
  ```sql
  -- Check existing functions
  SELECT proname, pronamespace::regnamespace as schema
  FROM pg_proc
  WHERE proname IN ('is_member_of', 'has_min_role', 'touch_updated_at', 'handle_new_user', 'current_user_id')
  ORDER BY proname, schema;
  
  -- Check existing enums
  SELECT typname, typnamespace::regnamespace as schema
  FROM pg_type
  WHERE typname IN ('org_role', 'role_level', 'engagement_status', 'severity_level', 
                    'reconciliation_type', 'reconciliation_item_category')
  ORDER BY typname, schema;
  ```

- [ ] **Check Migration Status**
  ```bash
  supabase migration list --linked
  ```

---

## Staging Deployment

### Step 1: Deploy to Staging

```bash
# Connect to staging database
supabase db push --linked
```

### Step 2: Verify Functions

```sql
-- Verify functions exist and are correct
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  p.prosecdef as security_definer,
  p.proconfig as search_path_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('is_member_of', 'has_min_role', 'touch_updated_at', 
                    'handle_new_user', 'current_user_id')
ORDER BY p.proname;
```

### Step 3: Verify Enums

```sql
-- Verify enums exist
SELECT 
  t.typname as enum_name,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('org_role', 'role_level', 'engagement_status', 'severity_level',
                    'reconciliation_type', 'reconciliation_item_category')
GROUP BY t.typname
ORDER BY t.typname;
```

### Step 4: Test RLS Policies

```sql
-- Test that RLS functions work
SELECT public.is_member_of('00000000-0000-0000-0000-000000000000'::uuid);
SELECT public.has_min_role('00000000-0000-0000-0000-000000000000'::uuid, 'EMPLOYEE'::public.org_role);
SELECT public.current_user_id();
```

### Step 5: Test Application Functionality

- [ ] User authentication works
- [ ] RLS policies function correctly
- [ ] Organization access control works
- [ ] Role-based permissions work
- [ ] No application errors in logs

---

## Production Deployment

### Pre-Production Checklist

- [ ] Staging tests passed
- [ ] Application functionality verified
- [ ] Performance verified (no degradation)
- [ ] Backup created
- [ ] Rollback plan prepared
- [ ] Maintenance window scheduled (if needed)

### Step 1: Deploy to Production

```bash
# Connect to production database
supabase db push --linked
```

### Step 2: Verify Deployment

Run the same verification queries as staging.

### Step 3: Monitor

- [ ] Monitor application logs for errors
- [ ] Monitor database performance
- [ ] Verify user functionality
- [ ] Check for any RLS policy issues

### Step 4: Post-Deployment Verification

- [ ] All functions working correctly
- [ ] All enums available
- [ ] RLS policies functioning
- [ ] Application working normally
- [ ] No performance issues

---

## Rollback Procedure

If issues occur:

```sql
-- Functions will be reverted by previous migrations
-- Enums are idempotent (DO blocks with exception handling)
-- No manual rollback needed - migrations are safe
```

However, if needed:

```bash
# Restore from backup
pg_restore --clean --if-exists \
  --dbname="$DATABASE_URL" \
  backup_before_consolidation_*.sql
```

---

## Success Criteria

- ✅ Migrations applied successfully
- ✅ All functions exist and work correctly
- ✅ All enums exist with correct values
- ✅ RLS policies function correctly
- ✅ Application functionality maintained
- ✅ No performance degradation
- ✅ No errors in logs

---

## Notes

- Migrations are **idempotent** (safe to run multiple times)
- Migrations use `CREATE OR REPLACE` for functions (safe)
- Migrations use `DO $$ BEGIN ... EXCEPTION` for enums (safe)
- **No data changes** - only function/enum definitions
- **Backward compatible** - legacy enums maintained
- **Low risk** - can be safely deployed

---

**Status:** Ready for Deployment  
**Risk Level:** LOW  
**Estimated Downtime:** None (functions/enums only)

