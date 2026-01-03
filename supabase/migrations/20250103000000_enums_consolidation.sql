-- ============================================================================
-- Enums Consolidation Migration
-- ============================================================================
-- Purpose: Create single authoritative definitions for all enums
-- Date: 2025-01-03
-- Risk Level: LOW (IF NOT EXISTS and exception handling protect against duplicates)
-- 
-- This migration consolidates 6+ duplicate enum definitions into
-- single, well-documented, authoritative implementations.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ORGANIZATION ROLE ENUM (Primary Role System)
-- ============================================================================
-- Unified role system for organization memberships
-- Hierarchy: SYSTEM_ADMIN > PARTNER > EQR > MANAGER > SERVICE_ACCOUNT > EMPLOYEE > CLIENT > READONLY
-- ============================================================================

DO $$
BEGIN
  CREATE TYPE public.org_role AS ENUM (
    'SYSTEM_ADMIN',
    'PARTNER',
    'EQR',
    'MANAGER',
    'SERVICE_ACCOUNT',
    'EMPLOYEE',
    'CLIENT',
    'READONLY'
  );
EXCEPTION WHEN duplicate_object THEN 
  -- Enum already exists, continue
  NULL;
END $$;

COMMENT ON TYPE public.org_role IS 
'Organization role hierarchy for user memberships. Roles ordered by precedence: SYSTEM_ADMIN (100) > PARTNER (90) > EQR (85) > MANAGER (70) > SERVICE_ACCOUNT (45) > EMPLOYEE (40) > CLIENT (30) > READONLY (20).';

-- ============================================================================
-- 2. ENGAGEMENT STATUS ENUM
-- ============================================================================
-- Status values for engagement lifecycle
-- ============================================================================

DO $$
BEGIN
  CREATE TYPE public.engagement_status AS ENUM (
    'planned',
    'active',
    'completed',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN 
  NULL;
END $$;

COMMENT ON TYPE public.engagement_status IS 
'Engagement lifecycle status values: planned (initial state), active (in progress), completed (finished), archived (historical).';

-- ============================================================================
-- 3. SEVERITY LEVEL ENUM
-- ============================================================================
-- Severity levels for logs, errors, and notifications
-- ============================================================================

DO $$
BEGIN
  CREATE TYPE public.severity_level AS ENUM (
    'info',
    'warn',
    'error'
  );
EXCEPTION WHEN duplicate_object THEN 
  NULL;
END $$;

COMMENT ON TYPE public.severity_level IS 
'Severity levels for system events: info (informational), warn (warning), error (error condition).';

-- ============================================================================
-- 4. LEGACY ROLE LEVEL ENUM (Deprecated)
-- ============================================================================
-- Legacy role system - DEPRECATED, use org_role instead
-- Maintained for backward compatibility during migration
-- ============================================================================

DO $$
BEGIN
  CREATE TYPE public.role_level AS ENUM (
    'EMPLOYEE',
    'MANAGER',
    'SYSTEM_ADMIN'
  );
EXCEPTION WHEN duplicate_object THEN 
  NULL;
END $$;

COMMENT ON TYPE public.role_level IS 
'DEPRECATED: Legacy role system. Use org_role instead. This enum is maintained for backward compatibility only and will be removed in a future migration after all references are migrated to org_role.';

-- ============================================================================
-- 5. RECONCILIATION TYPE ENUM
-- ============================================================================
-- Types of reconciliation processes
-- ============================================================================

DO $$
BEGIN
  CREATE TYPE public.reconciliation_type AS ENUM (
    'BANK',
    'AR',
    'AP',
    'GRNI',
    'PAYROLL',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN 
  NULL;
END $$;

COMMENT ON TYPE public.reconciliation_type IS 
'Types of reconciliation processes: BANK (bank reconciliation), AR (accounts receivable), AP (accounts payable), GRNI (goods received not invoiced), PAYROLL (payroll reconciliation), OTHER (other types).';

-- ============================================================================
-- 6. RECONCILIATION ITEM CATEGORY ENUM
-- ============================================================================
-- Categories for reconciliation items
-- ============================================================================

DO $$
BEGIN
  CREATE TYPE public.reconciliation_item_category AS ENUM (
    'OUTSTANDING_CHECKS',
    'DEPOSITS_IN_TRANSIT',
    'UNIDENTIFIED',
    'UNAPPLIED_RECEIPT',
    'UNAPPLIED_PAYMENT',
    'TIMING',
    'ERROR',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN 
  NULL;
END $$;

COMMENT ON TYPE public.reconciliation_item_category IS 
'Categories for reconciliation items: OUTSTANDING_CHECKS, DEPOSITS_IN_TRANSIT, UNIDENTIFIED, UNAPPLIED_RECEIPT, UNAPPLIED_PAYMENT, TIMING (timing differences), ERROR (errors), OTHER.';

COMMIT;

-- ============================================================================
-- Migration Notes:
-- ============================================================================
-- 1. All enums use DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--    This makes the migration idempotent and safe to run multiple times
-- 2. Enums are defined in dependency order (org_role first as it's most used)
-- 3. role_level is maintained for backward compatibility but marked as deprecated
-- 4. All enums have comprehensive documentation via COMMENT statements
-- 5. Future migration will remove role_level enum after all references migrated
-- ============================================================================

