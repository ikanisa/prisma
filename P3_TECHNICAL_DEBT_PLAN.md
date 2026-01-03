# P3 - Technical Debt Action Plan

**Date:** 2025-01-03  
**Priority:** Low (Technical Debt)  
**Status:** Planning Phase

---

## Overview

This document outlines the action plan for addressing P3 technical debt items. These are low-priority improvements that will enhance code quality, maintainability, and reduce technical debt over time.

---

## P3-1: Deprecated Dependencies

### Status: ⏳ Pending
### Impact: Medium
### Effort: 2-4 hours per package

### Dependencies to Address

#### 1. `@supabase/auth-helpers-nextjs@0.15.0` (Deprecated)
- **Current:** 0.15.0 (deprecated)
- **Target:** Migrate to `@supabase/ssr` (recommended replacement)
- **Impact:** Breaking changes in API
- **Risk:** Medium (authentication changes)

**Action Plan:**
1. Review current usage of `@supabase/auth-helpers-nextjs`
2. Identify all files using this package
3. Migrate to `@supabase/ssr` following Supabase migration guide
4. Test authentication flows thoroughly
5. Update documentation

**Files to Review:**
```bash
grep -r "@supabase/auth-helpers-nextjs" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"
```

#### 2. `eslint@8.57.1` (Should upgrade to 9.x in agents)
- **Current:** 8.57.1
- **Target:** 9.x
- **Impact:** Configuration changes required
- **Risk:** Low (mostly configuration updates)

**Action Plan:**
1. Review ESLint configuration files
2. Update to ESLint 9.x configuration format (flat config)
3. Update plugins and rules
4. Fix any new linting errors
5. Test build process

**Files to Review:**
- `eslint.config.js` (or `.eslintrc.*`)
- Agent package ESLint configs

#### 3. `next@14.2.18` (Deprecated, upgrade to 15.x)
- **Current:** 14.2.18
- **Target:** 15.x
- **Impact:** Breaking changes in Next.js API
- **Risk:** Medium-High (major version upgrade)

**Action Plan:**
1. Review Next.js 15 migration guide
2. Check for breaking changes affecting the codebase
3. Update dependencies that depend on Next.js
4. Test all Next.js features (routing, SSR, API routes, etc.)
5. Update configuration files
6. Fix any breaking changes

**Key Breaking Changes to Watch:**
- App Router changes
- Image component changes
- API route changes
- Configuration changes

---

## P3-2: TypeScript Strict Mode

### Status: ⏳ Pending
### Impact: High (Code Quality)
### Effort: 4-8 hours

### Current State
- `ignoreBuildErrors: true` in `next.config`
- TypeScript errors are ignored during build
- Reduces type safety

### Target State
- Enable strict TypeScript checking
- Fix all type errors
- Remove `ignoreBuildErrors: true`

### Action Plan

#### Phase 1: Enable Strict Mode Gradually
1. Update `tsconfig.json` to enable strict mode incrementally:
   ```json
   {
     "compilerOptions": {
       "strict": true,
       // Or enable individually:
       "strictNullChecks": true,
       "strictFunctionTypes": true,
       "strictBindCallApply": true,
       "strictPropertyInitialization": true,
       "noImplicitThis": true,
       "alwaysStrict": true
     }
   }
   ```

2. Start with new files first (strict mode enabled)
3. Gradually fix existing files

#### Phase 2: Fix Type Errors
1. Run `tsc --noEmit` to identify all errors
2. Categorize errors by type
3. Fix errors incrementally by file/component
4. Use type assertions carefully (avoid `as any`)

#### Phase 3: Remove ignoreBuildErrors
1. Once all errors are fixed, remove `ignoreBuildErrors: true`
2. Add `tsc --noEmit` to CI/CD pipeline
3. Enforce type checking in pre-commit hooks

### Files to Review
- `tsconfig.json`
- `next.config.ts` / `next.config.js`
- All TypeScript files in the project

---

## P3-3: Python Type Hints

### Status: ⏳ Pending
### Impact: Medium (Code Quality)
### Effort: 6-10 hours

### Current State
- Partial type hint coverage in `server/`
- No mypy in CI
- Type safety not enforced

### Target State
- Full type hint coverage
- mypy in CI pipeline
- Type safety enforced

### Action Plan

#### Phase 1: Add Type Hints to Critical Files
1. Identify files with missing type hints
2. Add type hints to:
   - Function signatures
   - Class attributes
   - Return types
   - Parameters

#### Phase 2: Configure mypy
1. Create `mypy.ini` or `pyproject.toml` with mypy configuration
2. Set strictness level (start with moderate, move to strict)
3. Configure ignore patterns for third-party libraries

#### Phase 3: Integrate mypy into CI
1. Add mypy to CI pipeline
2. Run mypy on pull requests
3. Fail builds on type errors (after initial cleanup)

#### Phase 4: Full Coverage
1. Gradually add type hints to all files
2. Fix mypy errors incrementally
3. Document type patterns and conventions

### Files to Review
```bash
find server/ -name "*.py" -exec grep -L "->\|:" {} \;
```

### Configuration Example
```ini
# mypy.ini
[mypy]
python_version = 3.11
warn_return_any = True
warn_unused_configs = True
disallow_untyped_defs = False  # Start with False, move to True
strict_optional = True
```

---

## P3-4: Migration Cleanup

### Status: ✅ Partially Complete (Function Consolidation Done)
### Impact: High (Database Maintainability)
### Effort: 8-12 hours

### Current State
- 153+ migration files
- Some overlapping changes
- Duplicate function definitions (partially addressed)
- Migration history could be optimized

### Completed Work
- ✅ **Function Consolidation** - Consolidated 5 core functions into single migration
  - Migration: `20250103000000_core_functions_consolidation.sql`
  - Eliminated 17+ duplicate function definitions

### Remaining Work

#### Phase 1: Analysis (Complete)
- ✅ Migration analysis completed
- ✅ Duplicate functions identified and consolidated
- ✅ Cleanup opportunities documented

#### Phase 2: Enum Consolidation (Deferred)
- ⏳ Enum consolidation deferred due to enum value mismatch
- Will require careful planning and application code changes
- Status: Documented as technical debt

#### Phase 3: Migration Squashing Strategy
1. **Identify Candidates for Squashing:**
   - Migrations with overlapping table definitions
   - Migrations that only add indexes (can be combined)
   - Sequential migrations that modify the same table
   - Seed data migrations (can be combined)

2. **Create Squashed Migrations:**
   - Identify safe-to-squash migration groups
   - Create consolidated migration files
   - Test squashed migrations on staging

3. **Documentation:**
   - Document which migrations were squashed
   - Maintain migration history reference
   - Update deployment procedures if needed

#### Phase 4: Cleanup Old Migrations (Future)
- Mark old migrations as "consolidated" (add comments)
- Document which functionality was moved to consolidated migrations
- Keep old migrations for historical reference (don't delete)

### Tools Created
- ✅ `scripts/analyze_migrations.py` - Migration analyzer
- ✅ `CLEANUP_OPPORTUNITIES_REPORT.md` - Cleanup recommendations
- ✅ `MIGRATION_ANALYSIS_REPORT.md` - Full migration analysis

### Next Steps
1. Review cleanup opportunities report
2. Identify safe migration groups to squash
3. Create squashed migration files
4. Test on staging environment
5. Document squashing strategy

---

## Implementation Priority

### Recommended Order

1. **P3-4: Migration Cleanup** (Continue)
   - Already in progress
   - High impact on maintainability
   - Function consolidation complete, continue with other cleanup

2. **P3-2: TypeScript Strict Mode**
   - High impact on code quality
   - Prevents bugs
   - Can be done incrementally

3. **P3-1: Deprecated Dependencies**
   - Medium impact
   - Security and maintenance
   - Do one at a time

4. **P3-3: Python Type Hints**
   - Medium impact
   - Code quality
   - Can be done incrementally

---

## Resource Allocation

### Estimated Total Effort
- P3-1: 6-12 hours (3 dependencies)
- P3-2: 4-8 hours
- P3-3: 6-10 hours
- P3-4: 4-8 hours (remaining work)

**Total: 20-38 hours**

### Recommended Approach
- Work on one item at a time
- Do incremental improvements
- Test thoroughly before moving to next item
- Document changes

---

## Success Criteria

### P3-1: Deprecated Dependencies
- [ ] All deprecated dependencies updated
- [ ] No deprecated warnings in build logs
- [ ] All features tested and working

### P3-2: TypeScript Strict Mode
- [ ] Strict mode enabled
- [ ] `ignoreBuildErrors: true` removed
- [ ] Zero type errors
- [ ] Type checking in CI

### P3-3: Python Type Hints
- [ ] Full type hint coverage
- [ ] mypy integrated in CI
- [ ] Zero mypy errors (or acceptable exceptions documented)

### P3-4: Migration Cleanup
- [ ] Function consolidation complete ✅
- [ ] Enum consolidation planned (or deferred with documentation)
- [ ] Migration squashing strategy implemented
- [ ] Migration count reduced significantly
- [ ] All migrations tested and verified

---

## Notes

- These are low-priority items - don't block other work
- Can be done incrementally
- Focus on high-impact items first
- Document progress and decisions
- Test thoroughly before considering complete

---

**Status:** Planning complete, ready for implementation prioritization


