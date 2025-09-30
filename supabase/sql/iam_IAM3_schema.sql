-- IAM-3 WhatsApp OTP schema additions
set check_function_bodies = off;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'mfa_channel'
  ) THEN
    CREATE TYPE public.mfa_channel AS ENUM ('WHATSAPP');
  END IF;
END $$;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS whatsapp_verified boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.mfa_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  channel public.mfa_channel NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  consumed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mfa_challenges_org_user_idx
  ON public.mfa_challenges (org_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS mfa_challenges_expiry_idx
  ON public.mfa_challenges (expires_at);
