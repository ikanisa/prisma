# Migration Cleanup Documentation

**Generated:** 2025-01-03

**Purpose:** Document cleanup strategies for duplicate definitions

## Cleanup Strategy


After applying consolidation migrations (Phase 1 & 2), duplicate
function and enum definitions can be safely ignored or removed.

### Option 1: Leave As-Is (Recommended)


Since `CREATE OR REPLACE FUNCTION` and `DO $$ BEGIN ... EXCEPTION`
blocks are idempotent, duplicate definitions don't cause issues.
The consolidation migrations will override older definitions.

**Pros:**
- No code changes needed
- No risk of breaking migrations
- Historical migration files remain intact

**Cons:**
- Code clarity (duplicate definitions visible)
- Migration files larger than necessary

### Option 2: Migration Repair (Safe)


Use Supabase migration repair to mark migrations as reverted:

```bash
# Mark old migrations as reverted (they're superseded by consolidation)
supabase migration repair --status reverted <migration_name>
```

**Pros:**
- Clean migration history
- No code changes to migration files
- Official Supabase approach

**Cons:**
- Requires understanding which migrations to mark
- Migration history changes

### Option 3: Manual Cleanup (Not Recommended)


Manually remove duplicate CREATE statements from migration files.

**Pros:**
- Cleanest code

**Cons:**
- High risk of errors
- Requires careful review
- Historical changes
- Not recommended for production

## Functions That Can Be Cleaned Up


These functions are now defined in `20250103000000_core_functions_consolidation.sql`:


### `app.current_user_id`

Defined in 8 older migration(s):
- `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
- `20250830125648_f73e809f-f983-405f-9ed8-e17d84d48869.sql`
- `20250830125703_5bf2f541-dcd5-4c5e-a182-de2328149a5f.sql`
- `20250830125839_.sql`
- `20250830125841_9195bd32-1de7-41d9-ac3c-d017d0dbe16a.sql`
- `20250924014606_remote_schema.sql`
- `20251018101620_remote_schema.sql`

**Action:** Function is now consolidated. Older definitions are safe to ignore.

### `app.is_member_of`

Defined in 3 older migration(s):
- `20250924141001_tax_mt_nid_patent_box_rls.sql`
- `20250925220000_app_is_member_of_wrapper.sql`
- `20251018101620_remote_schema.sql`

**Action:** Function is now consolidated. Older definitions are safe to ignore.

### `app.touch_updated_at`

Defined in 6 older migration(s):
- `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
- `20250830125839_.sql`
- `20250830125841_9195bd32-1de7-41d9-ac3c-d017d0dbe16a.sql`
- `20250924014606_remote_schema.sql`
- `20251018101620_remote_schema.sql`

**Action:** Function is now consolidated. Older definitions are safe to ignore.

### `public.handle_new_user`

Defined in 10 older migration(s):
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

**Action:** Function is now consolidated. Older definitions are safe to ignore.

### `public.handle_updated_at`

Defined in 9 older migration(s):
- `20250821115117_.sql`
- `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
- `20250821115348_878f265d-a747-47a8-aade-2f2d66847d8c.sql`
- `20250821115406_.sql`
- `20250821115407_50fe85e1-e606-4424-960d-acc41a893410.sql`
- `20250924014606_remote_schema.sql`
- `20251004112226_e845fcd6-6600-469d-91ac-00f716b13d33.sql`
- `20251018101620_remote_schema.sql`
- `20251128000001_database_function_security_patch.sql`

**Action:** Function is now consolidated. Older definitions are safe to ignore.

### `public.has_min_role`

Defined in 12 older migration(s):
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

**Action:** Function is now consolidated. Older definitions are safe to ignore.

### `public.is_member_of`

Defined in 9 older migration(s):
- `20250821115117_.sql`
- `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
- `20250821115348_878f265d-a747-47a8-aade-2f2d66847d8c.sql`
- `20250821115406_.sql`
- `20250821115407_50fe85e1-e606-4424-960d-acc41a893410.sql`
- `20250924014606_remote_schema.sql`
- `20251004112226_e845fcd6-6600-469d-91ac-00f716b13d33.sql`
- `20251018101620_remote_schema.sql`
- `20251128000001_database_function_security_patch.sql`

**Action:** Function is now consolidated. Older definitions are safe to ignore.

### `public.update_updated_at_column`

Defined in 2 older migration(s):
- `20251202000307_agent_production_system.sql`
- `20260201000000_comprehensive_agent_portal.sql`

**Action:** Function is now consolidated. Older definitions are safe to ignore.

## Enums That Can Be Cleaned Up


These enums are now defined in `20250103000001_enums_consolidation.sql`:


### `public.engagement_status`

Defined in 6 older migration(s):
- `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
- `20250830125719_.sql`
- `20250830125720_1b779663-4991-4f79-83e6-f963458284ae.sql`
- `20250830125735_.sql`
- `20250830125736_e118852a-6ecd-46c6-9c5d-53935d524f61.sql`

**Action:** Enum is now consolidated. Older definitions are safe to ignore.

### `public.org_role`

Defined in 6 older migration(s):
- `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
- `20250830125719_.sql`
- `20250830125720_1b779663-4991-4f79-83e6-f963458284ae.sql`
- `20250830125735_.sql`
- `20250830125736_e118852a-6ecd-46c6-9c5d-53935d524f61.sql`

**Action:** Enum is now consolidated. Older definitions are safe to ignore.

### `public.reconciliation_item_category`

Defined in 2 older migration(s):
- `20250924103000_accounting_close_gl.sql`
- `20251111090000_audit_ctrl1_ada1_rec1.sql`

**Action:** Enum is now consolidated. Older definitions are safe to ignore.

### `public.reconciliation_type`

Defined in 2 older migration(s):
- `20250924103000_accounting_close_gl.sql`
- `20251111090000_audit_ctrl1_ada1_rec1.sql`

**Action:** Enum is now consolidated. Older definitions are safe to ignore.

### `public.role_level`

Defined in 2 older migration(s):
- `20250821115117_.sql`
- `20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`

**Action:** Enum is now consolidated. Older definitions are safe to ignore.

### `public.severity_level`

Defined in 6 older migration(s):
- `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- `20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql`
- `20250830125719_.sql`
- `20250830125720_1b779663-4991-4f79-83e6-f963458284ae.sql`
- `20250830125735_.sql`
- `20250830125736_e118852a-6ecd-46c6-9c5d-53935d524f61.sql`

**Action:** Enum is now consolidated. Older definitions are safe to ignore.

## Recommended Approach


**For Now:** Leave migrations as-is (Option 1)

- Consolidation migrations override older definitions
- No risk of breaking changes
- Historical migration files remain intact

**Future Consideration:** Migration repair (Option 2)

- After consolidation migrations are proven stable
- Can clean up migration history
- Use Supabase's official repair tool