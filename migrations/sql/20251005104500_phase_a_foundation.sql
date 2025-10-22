-- Phase A foundation & governance migration
set check_function_bodies = off;

-- Ensure autonomy enum exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'autonomy_level'
  ) THEN
    CREATE TYPE public.autonomy_level AS ENUM ('L0', 'L1', 'L2', 'L3');
  END IF;
END $$;

-- Extend memberships with autonomy, service account, and client portal scope metadata
ALTER TABLE IF EXISTS public.memberships
  ADD COLUMN IF NOT EXISTS autonomy_floor public.autonomy_level NOT NULL DEFAULT 'L0',
  ADD COLUMN IF NOT EXISTS autonomy_ceiling public.autonomy_level NOT NULL DEFAULT 'L2',
  ADD COLUMN IF NOT EXISTS is_service_account boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_portal_allowed_repos text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS client_portal_denied_actions text[] NOT NULL DEFAULT ARRAY[]::text[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'memberships_autonomy_floor_ceiling_check'
      AND conrelid = 'public.memberships'::regclass
  ) THEN
    ALTER TABLE public.memberships
      ADD CONSTRAINT memberships_autonomy_floor_ceiling_check
      CHECK (autonomy_floor <= autonomy_ceiling);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_memberships_autonomy ON public.memberships(org_id, autonomy_ceiling);
CREATE INDEX IF NOT EXISTS idx_memberships_service_accounts ON public.memberships(org_id)
  WHERE is_service_account = true;

-- Extend approval queue with autonomy gating metadata
ALTER TABLE IF EXISTS public.approval_queue
  ADD COLUMN IF NOT EXISTS autonomy_gate public.autonomy_level NOT NULL DEFAULT 'L1',
  ADD COLUMN IF NOT EXISTS manifest_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS service_account_membership_id uuid REFERENCES public.memberships(id);

-- Store provenance with company profile drafts
ALTER TABLE IF EXISTS public.company_profile_drafts
  ADD COLUMN IF NOT EXISTS provenance jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Replace has_min_role with org_role-aware implementation
CREATE OR REPLACE FUNCTION public.has_min_role(org uuid, min public.org_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH current_role AS (
    SELECT
      m.role,
      CASE m.role
        WHEN 'SYSTEM_ADMIN' THEN 100
        WHEN 'PARTNER' THEN 90
        WHEN 'EQR' THEN 85
        WHEN 'MANAGER' THEN 70
        WHEN 'SERVICE_ACCOUNT' THEN 45
        WHEN 'EMPLOYEE' THEN 40
        WHEN 'CLIENT' THEN 30
        WHEN 'READONLY' THEN 20
        ELSE 0
      END AS precedence
    FROM public.memberships m
    WHERE m.org_id = org AND m.user_id = auth.uid()
    ORDER BY m.created_at DESC
    LIMIT 1
  ),
  required_role AS (
    SELECT CASE min
      WHEN 'SYSTEM_ADMIN' THEN 100
      WHEN 'PARTNER' THEN 90
      WHEN 'EQR' THEN 85
      WHEN 'MANAGER' THEN 70
      WHEN 'SERVICE_ACCOUNT' THEN 45
      WHEN 'EMPLOYEE' THEN 40
      WHEN 'CLIENT' THEN 30
      WHEN 'READONLY' THEN 20
      ELSE 0
    END AS precedence
  )
  SELECT COALESCE(
    (SELECT cr.precedence >= rr.precedence FROM current_role cr, required_role rr),
    false
  );
$$;

-- Ensure role helper accepts legacy role_level argument for backwards compatibility
CREATE OR REPLACE FUNCTION public.has_min_role(org uuid, min public.role_level)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_min_role(org, CASE min
    WHEN 'SYSTEM_ADMIN' THEN 'SYSTEM_ADMIN'::public.org_role
    WHEN 'MANAGER' THEN 'MANAGER'::public.org_role
    ELSE 'EMPLOYEE'::public.org_role
  END);
$$;

