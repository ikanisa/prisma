# Cleanup Opportunities Report

**Generated:** 2025-01-03

**Purpose:** Identify duplicate definitions that can be removed after consolidation migrations

## Summary

- **Functions to Clean Up:** 8
- **Enums to Clean Up:** 6

## Functions Safe to Remove


⚠️ **IMPORTANT:** Only remove these AFTER applying consolidation migrations:
- `20250103000000_core_functions_consolidation.sql`

These functions are now defined in the consolidation migration.


### `app.current_user_id`
**Defined in 8 older migration(s):**
- `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
- `20250830125648_f73e809f-f983-405f-9ed8-e17d84d48869.sql`
- `20250830125703_5bf2f541-dcd5-4c5e-a182-de2328149a5f.sql`
- `20250830125839_.sql`
- `20250830125841_9195bd32-1de7-41d9-ac3c-d017d0dbe16a.sql`
- `20250924014606_remote_schema.sql`
- `20251018101620_remote_schema.sql`

**Action:** Remove CREATE FUNCTION statement from above files
(Function is now in `20250103000000_core_functions_consolidation.sql`)

### `app.is_member_of`
**Defined in 3 older migration(s):**
- `20250924141001_tax_mt_nid_patent_box_rls.sql`
- `20250925220000_app_is_member_of_wrapper.sql`
- `20251018101620_remote_schema.sql`

**Action:** Remove CREATE FUNCTION statement from above files
(Function is now in `20250103000000_core_functions_consolidation.sql`)

### `app.touch_updated_at`
**Defined in 6 older migration(s):**
- `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
- `20250830125839_.sql`
- `20250830125841_9195bd32-1de7-41d9-ac3c-d017d0dbe16a.sql`
- `20250924014606_remote_schema.sql`
- `20251018101620_remote_schema.sql`

**Action:** Remove CREATE FUNCTION statement from above files
(Function is now in `20250103000000_core_functions_consolidation.sql`)

### `public.handle_new_user`
**Defined in 10 older migration(s):**
- `20250821115117_.sql`
- `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
- `20250821115348_878f265d-a747-47a8-aade-2f2d66847d8c.sql`
- `20250821115406_.sql`
- `20250821115407_50fe85e1-e606-4424-960d-acc41a893410.sql`
- `20250924014606_remote_schema.sql`
- `20251004112226_e845fcd6-6600-469d-91ac-00f716b13d33.sql`
- `20251018101620_remote_schema.sql`
- `20251128000001_database_function_security_patch.sql`
- `20260103010000_user_management_roles.sql`

**Action:** Remove CREATE FUNCTION statement from above files
(Function is now in `20250103000000_core_functions_consolidation.sql`)

### `public.handle_updated_at`
**Defined in 9 older migration(s):**
- `20250821115117_.sql`
- `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
- `20250821115348_878f265d-a747-47a8-aade-2f2d66847d8c.sql`
- `20250821115406_.sql`
- `20250821115407_50fe85e1-e606-4424-960d-acc41a893410.sql`
- `20250924014606_remote_schema.sql`
- `20251004112226_e845fcd6-6600-469d-91ac-00f716b13d33.sql`
- `20251018101620_remote_schema.sql`
- `20251128000001_database_function_security_patch.sql`

**Action:** Remove CREATE FUNCTION statement from above files
(Function is now in `20250103000000_core_functions_consolidation.sql`)

### `public.has_min_role`
**Defined in 12 older migration(s):**
- `20250821115117_.sql`
- `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
- `20250821115348_878f265d-a747-47a8-aade-2f2d66847d8c.sql`
- `20250821115406_.sql`
- `20250821115407_50fe85e1-e606-4424-960d-acc41a893410.sql`
- `20250924014606_remote_schema.sql`
- `20251004112226_e845fcd6-6600-469d-91ac-00f716b13d33.sql`
- `20251005104500_phase_a_foundation.sql`
- `20251005104500_phase_a_foundation.sql`
- `20251018101620_remote_schema.sql`
- `20251018101620_remote_schema.sql`
- `20251128000001_database_function_security_patch.sql`

**Action:** Remove CREATE FUNCTION statement from above files
(Function is now in `20250103000000_core_functions_consolidation.sql`)

### `public.is_member_of`
**Defined in 9 older migration(s):**
- `20250821115117_.sql`
- `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
- `20250821115348_878f265d-a747-47a8-aade-2f2d66847d8c.sql`
- `20250821115406_.sql`
- `20250821115407_50fe85e1-e606-4424-960d-acc41a893410.sql`
- `20250924014606_remote_schema.sql`
- `20251004112226_e845fcd6-6600-469d-91ac-00f716b13d33.sql`
- `20251018101620_remote_schema.sql`
- `20251128000001_database_function_security_patch.sql`

**Action:** Remove CREATE FUNCTION statement from above files
(Function is now in `20250103000000_core_functions_consolidation.sql`)

### `public.update_updated_at_column`
**Defined in 2 older migration(s):**
- `20251202000307_agent_production_system.sql`
- `20260201000000_comprehensive_agent_portal.sql`

**Action:** Remove CREATE FUNCTION statement from above files
(Function is now in `20250103000000_core_functions_consolidation.sql`)

## Enums Safe to Remove


⚠️ **IMPORTANT:** Only remove these AFTER applying consolidation migrations:
- `20250103000001_enums_consolidation.sql`

These enums are now defined in the consolidation migration.


### `public.engagement_status`
**Defined in 6 older migration(s):**
- `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
- `20250830125719_.sql`
- `20250830125720_1b779663-4991-4f79-83e6-f963458284ae.sql`
- `20250830125735_.sql`
- `20250830125736_e118852a-6ecd-46c6-9c5d-53935d524f61.sql`

**Action:** Remove CREATE TYPE statement from above files
(Enum is now in `20250103000001_enums_consolidation.sql`)

### `public.org_role`
**Defined in 6 older migration(s):**
- `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
- `20250830125719_.sql`
- `20250830125720_1b779663-4991-4f79-83e6-f963458284ae.sql`
- `20250830125735_.sql`
- `20250830125736_e118852a-6ecd-46c6-9c5d-53935d524f61.sql`

**Action:** Remove CREATE TYPE statement from above files
(Enum is now in `20250103000001_enums_consolidation.sql`)

### `public.reconciliation_item_category`
**Defined in 2 older migration(s):**
- `20250924103000_accounting_close_gl.sql`
- `20251111090000_audit_ctrl1_ada1_rec1.sql`

**Action:** Remove CREATE TYPE statement from above files
(Enum is now in `20250103000001_enums_consolidation.sql`)

### `public.reconciliation_type`
**Defined in 2 older migration(s):**
- `20250924103000_accounting_close_gl.sql`
- `20251111090000_audit_ctrl1_ada1_rec1.sql`

**Action:** Remove CREATE TYPE statement from above files
(Enum is now in `20250103000001_enums_consolidation.sql`)

### `public.role_level`
**Defined in 2 older migration(s):**
- `20250821115117_.sql`
- `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`

**Action:** Remove CREATE TYPE statement from above files
(Enum is now in `20250103000001_enums_consolidation.sql`)

### `public.severity_level`
**Defined in 6 older migration(s):**
- `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
- `20250830125719_.sql`
- `20250830125720_1b779663-4991-4f79-83e6-f963458284ae.sql`
- `20250830125735_.sql`
- `20250830125736_e118852a-6ecd-46c6-9c5d-53935d524f61.sql`

**Action:** Remove CREATE TYPE statement from above files
(Enum is now in `20250103000001_enums_consolidation.sql`)

## Cleanup Strategy


### Option 1: Migration Repair (Recommended)

Use Supabase migration repair to mark migrations as reverted:

```bash
# Mark specific migrations as reverted (after consolidation)
supabase migration repair --status reverted <migration_name>
```

### Option 2: Manual Cleanup

Manually remove duplicate CREATE statements from older migrations.

⚠️ **Warning:** This requires careful review and testing.


### Option 3: Create New Cleanup Migration

Create a new migration that removes old definitions:

```sql
-- This approach is NOT recommended for functions/enums
-- as they may already be in use
```

## Recommended Approach


1. **Apply Consolidation Migrations First**
   - Ensure `20250103000000_core_functions_consolidation.sql` is applied
   - Ensure `20250103000001_enums_consolidation.sql` is applied

2. **Verify Functions/Enums Work**
   - Test application functionality
   - Verify RLS policies still work

3. **Use Migration Repair (Safest)**
   - Mark old migrations as reverted
   - This removes them from active migration history
   - No code changes needed

4. **Alternative: Leave As-Is**
   - CREATE OR REPLACE functions are idempotent
   - DO blocks with exception handling are idempotent
   - Duplicate definitions don't cause issues
   - Cleanup is optional for code clarity