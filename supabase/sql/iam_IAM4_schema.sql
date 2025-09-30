-- IAM-4 Admin console schema extensions
set check_function_bodies = off;

ALTER TABLE IF EXISTS public.organizations
  ADD COLUMN IF NOT EXISTS allowed_email_domains text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_role public.org_role NOT NULL DEFAULT 'EMPLOYEE',
  ADD COLUMN IF NOT EXISTS require_mfa_for_sensitive boolean NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS public.organizations
  ADD COLUMN IF NOT EXISTS impersonation_breakglass_emails text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.impersonation_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  granted_by_user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  reason text,
  expires_at timestamptz,
  approved_by_user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, target_user_id, active)
);

CREATE INDEX IF NOT EXISTS impersonation_grants_org_active_idx ON public.impersonation_grants(org_id, active);
