# Database Schema Refactoring Analysis & Implementation Plan

**Generated:** 2025-01-03  
**Database:** Supabase PostgreSQL  
**Total Migrations:** 153  
**Analysis Date:** 2025-01-03

---

## Executive Summary

This report provides a comprehensive analysis of the current Supabase database schema, identifies critical consolidation opportunities, and presents a detailed implementation plan for refactoring to achieve a clean, maintainable database structure.

### Current State Metrics

- **Total Tables Identified:** 219 (with significant duplication)
- **Total Functions:** 66 (17 duplicates identified)
- **Total Enums:** 61 (6 duplicates identified)
- **Duplicate Table Definitions:** 64 tables
- **Duplicate Function Definitions:** 17 functions
- **Duplicate Enum Definitions:** 6 enums
- **Schema Inconsistencies:** Mixed use of `public` and `app` schemas

### Critical Issues Identified

1. **Massive Table Duplication** - 64 tables defined in multiple migration files
2. **Function Duplication** - Core RLS functions defined 10+ times
3. **Schema Confusion** - Mixed `public` and `app` schema usage
4. **Naming Inconsistencies** - Multiple user table names (profiles, users, app_users)
5. **Enum Duplication** - Core enums redefined across migrations
6. **Role System Complexity** - Multiple role systems (role_level, org_role) with overlapping purposes

---

## 1. Current Database State Analysis

### 1.1 Table Inventory by Domain

#### User Management Domain
- `profiles` (001_initial_schema.sql) - Initial schema
- `users` (20250821115117_, 20250821115118_) - Public schema users
- `app_users` (20250825140114, 20250830125235, 20250830125756) - App schema users

**Issue:** Three different user tables with overlapping purposes

#### Organization Domain
- `organizations` - Defined in 6 migration files with varying schemas
- `memberships` - Public schema membership table
- `members` - App schema membership table

**Issue:** Dual membership systems in different schemas

#### Engagement Domain
- `engagements` - Defined in 6 migration files
- `clients` - Client management tables

#### Knowledge Base Domain (High Duplication)
- `documents` - Defined in 8 migration files
- `knowledge_sources` - Defined in 10 migration files
- `knowledge_chunks` - Defined in 9 migration files
- `knowledge_documents` - Defined in 8 migration files
- `knowledge_embeddings` - Defined in 7 migration files
- `chunks` - Defined in 4 migration files

**Issue:** Extreme duplication in knowledge base schema

#### Agent System Domain
- `agent_executions` - Defined in 4 migration files
- `agent_sessions` - Defined in 3 migration files
- `agent_logs` - Defined in 2 migration files
- `agent_feedback` - Defined in 2 migration files
- Multiple agent-related tables with duplication

#### Accounting Domain
- `transactions` - Defined in 5 migration files
- `chart_of_accounts` - Defined in 4 migration files
- `categories` - Defined in 4 migration files
- `vendors` - Defined in 4 migration files

### 1.2 Function Inventory

#### Core RLS Functions (Highly Duplicated)

**`is_member_of`** - Defined in 11 migration files
- Core function for checking organization membership
- Multiple implementations with slight variations
- Used extensively in RLS policies

**`has_min_role`** - Defined in 11 migration files
- Role hierarchy checking function
- Multiple implementations with different role systems
- Critical for access control

**`handle_updated_at` / `touch_updated_at`** - Defined in 11 migration files
- Trigger function for updating timestamp columns
- Multiple names for same purpose (handle_updated_at, touch_updated_at, update_updated_at_column)

**`handle_new_user`** - Defined in 10 migration files
- Trigger function for new user creation
- Multiple implementations

**`current_user_id`** - Defined in 8 migration files
- Wrapper around auth.uid()
- Simple but duplicated

### 1.3 Enum Inventory

#### Role System Enums (Critical Duplication)

**`role_level`** - Defined in 2 migration files
- Values: `EMPLOYEE`, `MANAGER`, `SYSTEM_ADMIN`
- Used in public schema

**`org_role`** - Defined in 6 migration files
- Values: `admin`, `manager`, `staff`, `client`
- Used in app schema
- **Issue:** Overlapping with role_level but different naming

**`engagement_status`** - Defined in 6 migration files
- Values: `planned`, `active`, `completed`, `archived`

**`severity_level`** - Defined in 6 migration files
- Values: `info`, `warn`, `error`

---

## 2. Critical Issues & Impact Analysis

### 2.1 Schema Duplication Issues

#### Priority 1: User Management Tables

**Problem:**
- Three user tables: `profiles`, `public.users`, `app.app_users`
- Two membership tables: `public.memberships`, `app.members`
- Inconsistent references throughout codebase

**Impact:**
- Data integrity risks
- Confusion about which table to use
- Complex joins required
- RLS policy confusion

**Root Cause:**
- Evolution from initial schema (profiles) to public schema (users) to app schema (app_users)
- No migration consolidation

#### Priority 2: Core Function Duplication

**Problem:**
- `is_member_of` defined 11 times
- `has_min_role` defined 11 times
- `handle_updated_at` variants defined 11 times

**Impact:**
- Function signature drift
- Maintenance burden
- Potential security vulnerabilities if implementations differ
- Performance overhead (multiple function objects)

**Root Cause:**
- Functions recreated in multiple migrations without consolidation
- Lack of centralized function management

#### Priority 3: Knowledge Base Schema Chaos

**Problem:**
- `knowledge_sources` defined in 10 migrations
- `knowledge_chunks` defined in 9 migrations
- `knowledge_documents` defined in 8 migrations
- `documents` defined in 8 migrations

**Impact:**
- Extreme schema drift
- Unclear which definition is authoritative
- Migration ordering critical
- High risk of schema conflicts

**Root Cause:**
- Multiple attempts to define knowledge base schema
- No cleanup of redundant migrations

#### Priority 4: Schema Naming Inconsistencies

**Problem:**
- Mixed use of `public` and `app` schemas
- No clear separation of concerns
- Functions and tables scattered across schemas

**Impact:**
- Developer confusion
- Import path complexity
- RLS policy complexity

### 2.2 Role System Complexity

**Problem:**
- Two role systems: `role_level` (public) and `org_role` (app)
- Overlapping purposes but different values
- Functions need to handle both

**Impact:**
- Complex role mapping logic
- Potential authorization bugs
- Maintenance overhead

---

## 3. Refactoring Recommendations

### 3.1 Schema Consolidation Strategy

#### 3.1.1 User Management Consolidation

**Recommendation:** Consolidate to single user table

**Target State:**
```
public.users
  - id (UUID, PK, references auth.users)
  - email (TEXT, UNIQUE, NOT NULL)
  - full_name (TEXT)
  - avatar_url (TEXT)
  - is_system_admin (BOOLEAN)
  - metadata (JSONB)
  - created_at (TIMESTAMPTZ)
  - updated_at (TIMESTAMPTZ)

public.memberships
  - id (UUID, PK)
  - org_id (UUID, FK -> organizations)
  - user_id (UUID, FK -> users)
  - role (org_role ENUM)
  - created_at (TIMESTAMPTZ)
  - updated_at (TIMESTAMPTZ)
  - UNIQUE(org_id, user_id)
```

**Actions:**
1. Migrate data from `profiles` and `app_users` to `public.users`
2. Drop `profiles` and `app_users` tables
3. Migrate `app.members` to `public.memberships`
4. Update all foreign key references
5. Update RLS policies

#### 3.1.2 Schema Standardization

**Recommendation:** Use `public` schema for all application tables

**Rationale:**
- Supabase convention is to use `public` schema
- RLS works better with `public` schema
- Simpler imports and references
- Better tooling support

**Actions:**
1. Migrate all `app.*` tables to `public.*`
2. Update function schemas
3. Update RLS policies
4. Drop `app` schema (or keep for internal functions only)

#### 3.1.3 Role System Consolidation

**Recommendation:** Single unified role system

**Target State:**
```sql
CREATE TYPE public.org_role AS ENUM (
  'SYSTEM_ADMIN',
  'PARTNER',
  'EQR',
  'MANAGER',
  'EMPLOYEE',
  'SERVICE_ACCOUNT',
  'CLIENT',
  'READONLY'
);
```

**Actions:**
1. Create unified `org_role` enum with all roles
2. Migrate `role_level` values to `org_role`
3. Update all tables to use `org_role`
4. Drop `role_level` enum
5. Update all functions to use `org_role`

### 3.2 Function Consolidation Strategy

#### 3.2.1 Core RLS Functions

**Recommendation:** Create single authoritative function definitions

**Target Functions:**
1. `public.is_member_of(org_id UUID) RETURNS BOOLEAN`
2. `public.has_min_role(org_id UUID, min_role org_role) RETURNS BOOLEAN`
3. `public.touch_updated_at() RETURNS TRIGGER`
4. `public.handle_new_user() RETURNS TRIGGER`
5. `public.current_user_id() RETURNS UUID`

**Actions:**
1. Create migration: `20250103000000_core_functions_consolidation.sql`
2. Define all core functions in single file
3. Use `CREATE OR REPLACE FUNCTION` to override duplicates
4. Add `SECURITY DEFINER` where appropriate
5. Document function signatures and usage

#### 3.2.2 Trigger Function Standardization

**Recommendation:** Single `touch_updated_at` function for all tables

**Implementation:**
```sql
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

**Actions:**
1. Standardize all trigger functions to use `touch_updated_at`
2. Remove `handle_updated_at`, `update_updated_at_column` variants
3. Update all triggers

### 3.3 Table Consolidation Strategy

#### 3.3.1 Knowledge Base Tables

**Recommendation:** Single authoritative schema definition

**Target Tables:**
- `public.knowledge_sources` - Source documents/URLs
- `public.knowledge_chunks` - Chunked content with embeddings
- `public.knowledge_documents` - Document metadata
- `public.knowledge_embeddings` - Vector embeddings (if separate)
- `public.ingestion_jobs` - Ingestion job tracking
- `public.ingestion_files` - File-level tracking

**Actions:**
1. Identify most complete table definition
2. Create consolidation migration
3. Migrate data if needed
4. Drop duplicate table definitions from older migrations (via migration repair)
5. Document final schema

#### 3.3.2 Agent System Tables

**Recommendation:** Consolidate agent tables into single schema

**Target Tables:**
- `public.agent_sessions` - Agent conversation sessions
- `public.agent_executions` - Execution tracking
- `public.agent_logs` - Logging
- `public.agent_feedback` - User feedback
- `public.agent_guardrails` - Safety rules
- `public.agent_tools` - Tool definitions
- `public.agent_personas` - Persona definitions

**Actions:**
1. Review all agent table definitions
2. Consolidate to single comprehensive schema
3. Remove duplicates

#### 3.3.3 Accounting Tables

**Recommendation:** Consolidate accounting schema

**Target Tables:**
- `public.transactions` - Financial transactions
- `public.chart_of_accounts` - Account structure
- `public.categories` - Transaction categories
- `public.vendors` - Vendor management
- `public.journals` - Journal entries
- `public.accounting_close` - Close periods

**Actions:**
1. Review all accounting table definitions
2. Consolidate to single schema
3. Remove duplicates

### 3.4 Enum Consolidation

**Recommendation:** Single authoritative enum definitions

**Actions:**
1. Create migration: `20250103000001_enums_consolidation.sql`
2. Define all enums with `CREATE TYPE IF NOT EXISTS`
3. Use `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$;` blocks
4. Document enum values and usage

---

## 4. Implementation Plan

### Phase 1: Preparation & Analysis (Week 1)

#### 1.1 Backup & Safety
- [ ] Create full database backup
- [ ] Create staging environment clone
- [ ] Document current schema state (completed)
- [ ] Create rollback procedures

#### 1.2 Dependency Analysis
- [ ] Map all table dependencies (foreign keys)
- [ ] Map all function usage (grep analysis)
- [ ] Map all RLS policy dependencies
- [ ] Identify breaking changes

#### 1.3 Migration Audit
- [ ] Identify which migrations are actually applied
- [ ] Create migration dependency graph
- [ ] Identify safe-to-remove duplicate definitions
- [ ] Plan migration consolidation order

### Phase 2: Core Functions Consolidation (Week 2)

#### 2.1 Create Core Functions Migration
- [ ] Create: `20250103000000_core_functions_consolidation.sql`
- [ ] Define: `is_member_of`
- [ ] Define: `has_min_role` (with org_role support)
- [ ] Define: `touch_updated_at`
- [ ] Define: `handle_new_user`
- [ ] Define: `current_user_id`
- [ ] Add comprehensive documentation
- [ ] Add function tests (pgTAP)

#### 2.2 Apply Core Functions
- [ ] Test on staging
- [ ] Verify function signatures
- [ ] Verify RLS policies still work
- [ ] Apply to production

### Phase 3: User Management Consolidation (Week 3)

#### 3.1 User Table Migration
- [ ] Create: `20250103000002_user_management_consolidation.sql`
- [ ] Migrate data: `profiles` → `public.users`
- [ ] Migrate data: `app_users` → `public.users`
- [ ] Handle conflicts (email uniqueness)
- [ ] Update foreign keys

#### 3.2 Membership Table Migration
- [ ] Migrate data: `app.members` → `public.memberships`
- [ ] Map role values (org_role)
- [ ] Update foreign keys
- [ ] Update RLS policies

#### 3.3 Cleanup
- [ ] Drop `profiles` table
- [ ] Drop `app_users` table
- [ ] Drop `app.members` table
- [ ] Update application code references

### Phase 4: Schema Standardization (Week 4)

#### 4.1 Migrate App Schema to Public
- [ ] Create: `20250103000003_schema_standardization.sql`
- [ ] Identify all `app.*` tables
- [ ] Create `public.*` equivalents
- [ ] Migrate data
- [ ] Update foreign keys
- [ ] Update RLS policies

#### 4.2 Function Schema Updates
- [ ] Update function schemas to `public`
- [ ] Update function calls
- [ ] Update RLS policies

#### 4.3 App Schema Cleanup
- [ ] Review if `app` schema still needed
- [ ] Drop unused `app` schema objects
- [ ] Document schema usage

### Phase 5: Role System Consolidation (Week 5)

#### 5.1 Unified Role Enum
- [ ] Create: `20250103000004_role_system_consolidation.sql`
- [ ] Define unified `org_role` enum
- [ ] Migrate `role_level` values
- [ ] Update all tables

#### 5.2 Function Updates
- [ ] Update `has_min_role` to use `org_role`
- [ ] Remove `role_level` support (or deprecate)
- [ ] Update RLS policies

#### 5.3 Cleanup
- [ ] Drop `role_level` enum
- [ ] Update application code

### Phase 6: Table Consolidation (Weeks 6-8)

#### 6.1 Knowledge Base Consolidation
- [ ] Create: `20250103000005_knowledge_base_consolidation.sql`
- [ ] Identify authoritative schema
- [ ] Create consolidated tables
- [ ] Migrate data
- [ ] Update references
- [ ] Drop duplicates

#### 6.2 Agent System Consolidation
- [ ] Create: `20250103000006_agent_system_consolidation.sql`
- [ ] Consolidate agent tables
- [ ] Migrate data
- [ ] Update references

#### 6.3 Accounting Consolidation
- [ ] Create: `20250103000007_accounting_consolidation.sql`
- [ ] Consolidate accounting tables
- [ ] Migrate data
- [ ] Update references

### Phase 7: Enum Consolidation (Week 9)

#### 7.1 Enum Migration
- [ ] Create: `20250103000008_enums_consolidation.sql`
- [ ] Define all enums with IF NOT EXISTS
- [ ] Document enum values
- [ ] Update table definitions

### Phase 8: Migration Cleanup (Week 10)

#### 8.1 Migration Repair
- [ ] Use `supabase migration repair` to mark duplicates as reverted
- [ ] Remove duplicate CREATE TABLE statements
- [ ] Remove duplicate CREATE FUNCTION statements
- [ ] Keep only authoritative definitions

#### 8.2 Documentation
- [ ] Update schema documentation
- [ ] Create ER diagrams
- [ ] Document migration history
- [ ] Create developer guide

### Phase 9: Testing & Validation (Week 11)

#### 9.1 Functional Testing
- [ ] Test all RLS policies
- [ ] Test all functions
- [ ] Test application integration
- [ ] Performance testing

#### 9.2 Data Integrity
- [ ] Verify data migration completeness
- [ ] Verify foreign key integrity
- [ ] Verify constraint compliance
- [ ] Verify index functionality

### Phase 10: Deployment & Monitoring (Week 12)

#### 10.1 Production Deployment
- [ ] Schedule maintenance window
- [ ] Execute migrations in order
- [ ] Monitor for errors
- [ ] Verify application functionality

#### 10.2 Post-Deployment
- [ ] Monitor performance
- [ ] Monitor error logs
- [ ] Gather user feedback
- [ ] Document lessons learned

---

## 5. Risk Assessment & Mitigation

### 5.1 High Risk Areas

#### Data Loss Risk
- **Risk:** Data loss during table consolidation
- **Mitigation:**
  - Comprehensive backups before each phase
  - Staging environment testing
  - Data migration scripts with validation
  - Rollback procedures

#### Downtime Risk
- **Risk:** Extended downtime during migrations
- **Mitigation:**
  - Migrations designed for minimal downtime
  - Use `IF NOT EXISTS` clauses where possible
  - Phased rollout
  - Maintenance windows

#### Breaking Changes
- **Risk:** Application code breaks due to schema changes
- **Mitigation:**
  - Comprehensive dependency analysis
  - Update application code in parallel
  - Feature flags for gradual rollout
  - Extensive testing

#### Performance Impact
- **Risk:** Performance degradation from schema changes
- **Mitigation:**
  - Performance testing in staging
  - Index optimization
  - Query analysis
  - Monitoring during rollout

### 5.2 Rollback Procedures

Each phase should have:
1. Pre-migration backup
2. Rollback migration script
3. Data restoration procedure
4. Verification steps

---

## 6. Success Criteria

### 6.1 Schema Quality Metrics

- [ ] Zero duplicate table definitions
- [ ] Zero duplicate function definitions
- [ ] Zero duplicate enum definitions
- [ ] Single user table
- [ ] Single membership table
- [ ] Unified role system
- [ ] All tables in `public` schema (or clear separation)

### 6.2 Code Quality Metrics

- [ ] All functions documented
- [ ] All tables documented
- [ ] ER diagrams up to date
- [ ] Migration history clean
- [ ] RLS policies consistent

### 6.3 Performance Metrics

- [ ] No performance degradation
- [ ] Query performance maintained or improved
- [ ] Index coverage adequate
- [ ] Function execution times acceptable

---

## 7. Recommended Tools & Scripts

### 7.1 Analysis Scripts
- `database_refactoring_analysis.py` - Schema analysis (created)
- Migration dependency analyzer
- Foreign key mapper
- Function usage analyzer

### 7.2 Migration Scripts
- Data migration scripts per phase
- Validation scripts
- Rollback scripts
- Testing scripts

### 7.3 Documentation Tools
- ER diagram generator (dbdiagram.io, pgAdmin)
- Schema documentation generator
- Migration history visualizer

---

## 8. Long-Term Maintenance Recommendations

### 8.1 Migration Guidelines
1. Never duplicate table/function/enum definitions
2. Use `CREATE OR REPLACE` for functions
3. Use `IF NOT EXISTS` for tables/enums
4. Document all schema changes
5. Review migrations before merging

### 8.2 Schema Review Process
1. Weekly schema review
2. Monthly dependency analysis
3. Quarterly consolidation review
4. Annual major refactoring

### 8.3 Function Management
1. Central function library
2. Version control for functions
3. Function documentation standards
4. Function testing requirements

---

## 9. Conclusion

The current database schema suffers from significant duplication and inconsistencies accumulated over 153 migrations. This refactoring plan provides a structured approach to consolidating the schema while minimizing risk and downtime.

**Key Benefits:**
- Cleaner, more maintainable schema
- Reduced confusion and bugs
- Better performance (fewer objects)
- Easier onboarding for new developers
- Foundation for future growth

**Estimated Timeline:** 12 weeks (with proper testing and validation)

**Estimated Effort:** 2-3 developers working part-time on refactoring

**Priority:** High - Should be completed before adding significant new features

---

## Appendix A: Detailed Table Inventory

[Generated by analysis script - see database_refactoring_analysis.py output]

## Appendix B: Detailed Function Inventory

[Generated by analysis script - see database_refactoring_analysis.py output]

## Appendix C: Migration Dependency Graph

[To be generated during Phase 1 analysis]

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-03  
**Next Review:** After Phase 1 completion

