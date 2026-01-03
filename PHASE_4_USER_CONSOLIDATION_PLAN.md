# Phase 4: User Table Consolidation Plan

**Date:** 2025-01-03  
**Status:** 🔄 PLANNING  
**Risk Level:** MEDIUM (requires data migration)

---

## Objective

Consolidate multiple user-related tables into a single, authoritative schema:

1. **User Tables:** `profiles`, `users`, `app_users` → `public.users`
2. **Membership Tables:** `members`, `memberships` → `public.memberships` (with `org_role`)

---

## Current State Analysis

### User Tables Found

Based on migration analysis:

1. **`profiles`** (001_initial_schema.sql)
   - Schema: `public`
   - Columns: id, email, full_name, avatar_url, role, metadata, created_at, updated_at
   - References: auth.users(id)

2. **`users`** (20250821115117_, 20250821115118_)
   - Schema: `public`
   - Columns: id, email, name, avatar_url, is_system_admin, created_at, updated_at
   - References: auth.users(id)

3. **`app_users`** (20250825140114, 20250830125235, 20250830125756)
   - Schema: `app` (some migrations)
   - Columns: user_id, email, full_name, created_at
   - References: auth.users(id)

### Membership Tables Found

1. **`memberships`** (20250821115117_, 20250821115118_)
   - Schema: `public`
   - Columns: id, org_id, user_id, role (role_level), created_at, updated_at
   - Uses: `role_level` enum

2. **`members`** (20250825140114, 20250830125235)
   - Schema: `app`
   - Columns: org_id, user_id, role (org_role)
   - Uses: `org_role` enum

---

## Target Schema

### Consolidated User Table: `public.users`

```sql
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,                    -- from users table
  full_name TEXT,               -- from profiles, app_users
  avatar_url TEXT,              -- from profiles, users
  is_system_admin BOOLEAN DEFAULT false,  -- from users
  role TEXT,                    -- from profiles (deprecated, use memberships.role)
  metadata JSONB DEFAULT '{}'::jsonb,     -- from profiles
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Consolidated Membership Table: `public.memberships`

```sql
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'EMPLOYEE',  -- Unified role system
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);
```

---

## Migration Strategy

### Phase 4A: Pre-Migration Analysis

**Before proceeding, verify:**

1. **Table Existence:**
   ```sql
   SELECT tablename, schemaname 
   FROM pg_tables 
   WHERE schemaname IN ('public', 'app')
     AND tablename IN ('profiles', 'users', 'app_users', 'memberships', 'members');
   ```

2. **Data Counts:**
   ```sql
   SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
   UNION ALL SELECT 'users', COUNT(*) FROM users
   UNION ALL SELECT 'app_users', COUNT(*) FROM app_users
   UNION ALL SELECT 'memberships', COUNT(*) FROM memberships
   UNION ALL SELECT 'members', COUNT(*) FROM app.members;
   ```

3. **Email Conflicts:**
   ```sql
   SELECT email, COUNT(*) as occurrences
   FROM (
     SELECT email FROM profiles WHERE email IS NOT NULL
     UNION ALL 
     SELECT email FROM users WHERE email IS NOT NULL
     UNION ALL 
     SELECT email FROM app_users WHERE email IS NOT NULL
   ) t
   GROUP BY email 
   HAVING COUNT(*) > 1;
   ```

4. **Foreign Key Dependencies:**
   ```sql
   SELECT 
     tc.table_schema,
     tc.table_name, 
     kcu.column_name,
     ccu.table_schema AS foreign_table_schema,
     ccu.table_name AS foreign_table_name,
     ccu.column_name AS foreign_column_name
   FROM information_schema.table_constraints AS tc
   JOIN information_schema.key_column_usage AS kcu
     ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
   JOIN information_schema.constraint_column_usage AS ccu
     ON ccu.constraint_name = tc.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY'
     AND ccu.table_name IN ('profiles', 'users', 'app_users', 'memberships', 'members');
   ```

### Phase 4B: Data Migration

**Strategy:**

1. **Migrate Users:**
   - Start with `profiles` (oldest)
   - Merge `users` data (prefer non-null values)
   - Merge `app_users` data (fill in gaps)
   - Handle conflicts (same user_id in multiple tables)

2. **Migrate Memberships:**
   - Start with `public.memberships`
   - Merge `app.members` data
   - Map `role_level` → `org_role` for unified system
   - Handle conflicts (same org_id + user_id)

### Phase 4C: Foreign Key Updates

Update all tables that reference old user/membership tables to reference new consolidated tables.

### Phase 4D: Cleanup

After verification:
- Drop old tables: `profiles`, `app_users`, `app.members`
- Keep `users` if it becomes the consolidated table
- Update RLS policies

---

## Risk Assessment

### High Risk Areas

1. **Data Loss:** Risk of losing data during migration
   - **Mitigation:** Full backup before migration
   - **Mitigation:** Test on staging first
   - **Mitigation:** Validate data counts before/after

2. **Foreign Key Violations:** Breaking references
   - **Mitigation:** Map all dependencies first
   - **Mitigation:** Update foreign keys atomically
   - **Mitigation:** Use transaction blocks

3. **Email Conflicts:** Same email in multiple tables
   - **Mitigation:** Analyze conflicts first
   - **Mitigation:** Define conflict resolution strategy
   - **Mitigation:** Merge intelligently (prefer most complete record)

4. **Role System Conflicts:** role_level vs org_role
   - **Mitigation:** Map role_level → org_role carefully
   - **Mitigation:** Test role mappings
   - **Mitigation:** Document mapping rules

### Rollback Strategy

1. Keep backups of all source tables
2. Create migration script that can reverse changes
3. Test rollback procedure on staging

---

## Implementation Steps

1. ✅ **Analysis Complete** - User tables analyzed
2. ⏳ **Create Analysis Migration** - Document current state
3. ⏳ **Create Data Migration Script** - Based on analysis
4. ⏳ **Test on Staging** - Verify data migration
5. ⏳ **Update Foreign Keys** - Update all references
6. ⏳ **Drop Old Tables** - After verification
7. ⏳ **Update RLS Policies** - Ensure security
8. ⏳ **Verify Application** - Test application functionality

---

## Next Steps

1. Run analysis queries on actual database to get current state
2. Create data migration script based on actual data
3. Test migration on staging environment
4. Create production migration with proper error handling

---

## Notes

- **DO NOT EXECUTE** consolidation migration without:
  - Full database backup
  - Staging environment testing
  - Data conflict analysis
  - Foreign key dependency mapping

- This is a **PLANNING** document - actual migration will be created after data analysis

---

**Status:** Planning Phase  
**Next Action:** Run analysis queries on database to understand actual data state

