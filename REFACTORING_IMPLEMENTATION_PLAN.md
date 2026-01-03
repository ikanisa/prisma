# Database Refactoring Implementation Plan

**Date:** 2025-01-03  
**Status:** ACTIVE IMPLEMENTATION  
**Approach:** Incremental, Safe, Tested

---

## Implementation Strategy

### Principles
1. **Safety First** - All changes are reversible
2. **Incremental** - Small, testable changes
3. **Non-Breaking** - Maintain backward compatibility where possible
4. **Tested** - Each phase validated before proceeding

### Execution Order (Priority-Based)

**Phase 1: Core Functions Consolidation** ✅ STARTING NOW
- **Risk:** LOW (CREATE OR REPLACE is safe)
- **Impact:** HIGH (eliminates 17 duplicate functions)
- **Effort:** 2-3 hours
- **Status:** IN PROGRESS

**Phase 2: Enum Consolidation**
- **Risk:** LOW (IF NOT EXISTS protects)
- **Impact:** MEDIUM (eliminates 6 duplicate enums)
- **Effort:** 1-2 hours

**Phase 3: Migration Analysis & Documentation**
- **Risk:** NONE (read-only analysis)
- **Impact:** HIGH (foundation for all other work)
- **Effort:** 2-3 hours

**Phase 4: User Table Consolidation**
- **Risk:** MEDIUM (requires data migration)
- **Impact:** HIGH (eliminates 3 user tables)
- **Effort:** 4-6 hours
- **Requires:** Phase 3 completion

**Phase 5: Schema Standardization**
- **Risk:** MEDIUM (schema changes)
- **Impact:** HIGH (cleaner architecture)
- **Effort:** 6-8 hours
- **Requires:** Phase 4 completion

---

## Phase 1: Core Functions Consolidation

### Objective
Create single authoritative definitions for core RLS functions.

### Functions to Consolidate
1. `public.is_member_of(org_id UUID)`
2. `public.has_min_role(org_id UUID, min_role org_role)`  
3. `public.touch_updated_at()` (trigger function)
4. `public.handle_new_user()` (trigger function)
5. `public.current_user_id()`

### Implementation
- File: `supabase/migrations/20250103000000_core_functions_consolidation.sql`
- Use `CREATE OR REPLACE FUNCTION` (safe, idempotent)
- Add comprehensive documentation
- Include SECURITY DEFINER where needed
- Test on staging first

### Success Criteria
- ✅ Single definition of each function
- ✅ All RLS policies continue to work
- ✅ No breaking changes
- ✅ Functions perform as expected

---

## Phase 2: Enum Consolidation

### Objective
Create single authoritative enum definitions.

### Enums to Consolidate
1. `public.org_role`
2. `public.engagement_status`
3. `public.severity_level`
4. `public.role_level` (deprecate, migrate to org_role)

### Implementation
- File: `supabase/migrations/20250103000001_enums_consolidation.sql`
- Use `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$;`
- Document all enum values
- Plan migration from role_level to org_role

---

## Phase 3: Migration Analysis

### Objective
Understand current state and dependencies.

### Tasks
1. Identify which migrations are actually applied
2. Map table dependencies (foreign keys)
3. Map function usage across migrations
4. Create dependency graph
5. Identify safe-to-remove duplicates

### Deliverables
- Dependency graph visualization
- Migration audit report
- Safe cleanup recommendations

---

## Phase 4: User Table Consolidation

### Objective
Single user table in public schema.

### Current State
- `profiles` (001_initial_schema.sql)
- `public.users` (20250821115117_, 20250821115118_)
- `app.app_users` (20250825140114, etc.)

### Target State
- `public.users` (single, authoritative)

### Implementation Steps
1. Analyze data in all three tables
2. Create data migration script
3. Migrate data to public.users
4. Update foreign keys
5. Drop old tables
6. Update RLS policies

---

## Phase 5: Schema Standardization

### Objective
All application tables in public schema.

### Tasks
1. Migrate app.* tables to public.*
2. Update function schemas
3. Update RLS policies
4. Clean up app schema

---

## Progress Tracking

- [x] Plan created
- [ ] Phase 1: Core Functions (IN PROGRESS)
- [ ] Phase 2: Enum Consolidation
- [ ] Phase 3: Migration Analysis
- [ ] Phase 4: User Consolidation
- [ ] Phase 5: Schema Standardization

---

## Next Steps

1. **NOW**: Implement Phase 1 (Core Functions)
2. **Next**: Implement Phase 2 (Enums)
3. **Then**: Complete Phase 3 (Analysis)
4. **Finally**: Execute Phases 4-5 with full analysis

