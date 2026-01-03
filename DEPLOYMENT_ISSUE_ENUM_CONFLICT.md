# Deployment Issue: Enum Value Conflict

**Date:** 2025-01-03  
**Status:** ⚠️ BLOCKED - Enum Value Mismatch

---

## Issue Summary

The consolidation migrations are blocked by an enum value conflict. The `public.org_role` enum exists in the database with lowercase values from earlier migrations:

- Existing: `('admin','manager','staff','client')`
- Desired: `('SYSTEM_ADMIN','PARTNER','EQR','MANAGER','SERVICE_ACCOUNT','EMPLOYEE','CLIENT','READONLY')`

**Error:** `invalid input value for enum org_role: "SYSTEM_ADMIN"`

---

## Root Cause

1. Earlier migrations (e.g., `20250825140114`, `20250830125719`) created `org_role` enum with lowercase values
2. Our consolidation migration uses `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object` which silently skips creation if enum exists
3. PostgreSQL does not support:
   - Changing enum values after creation
   - `ALTER TYPE ... ADD VALUE IF NOT EXISTS` syntax
   - Removing enum values

---

## Impact

- ✅ Enum migration (`20250103000000`) applies successfully (enum already exists, so no-op)
- ❌ Function migration (`20250103000001`) fails (tries to use uppercase values that don't exist)

---

## Possible Solutions

### Option 1: Skip Enum Consolidation (Recommended for now)
- Remove enum consolidation migration
- Keep only function consolidation
- Functions work with existing enum values
- Document enum inconsistency as technical debt

### Option 2: Create New Enum with Different Name
- Create `public.org_role_v2` with desired values
- Migrate code to use new enum
- Requires application code changes

### Option 3: Drop and Recreate Enum (High Risk)
- Drop enum and all dependencies
- Recreate with desired values
- Very risky - requires downtime and careful dependency management

### Option 4: Work with Existing Enum Values
- Modify function migration to use lowercase values
- Map existing values to new function logic
- Maintains backward compatibility

---

## Recommendation

**Option 4** - Modify function migration to work with existing enum values, or **Option 1** - Skip enum consolidation for now and focus on function consolidation only.

The enum consolidation is less critical than function consolidation. Functions can be consolidated even if enums are inconsistent.

---

## Next Steps

1. Decide on solution approach
2. Modify migrations accordingly
3. Re-test deployment
4. Document enum technical debt if deferring enum consolidation

