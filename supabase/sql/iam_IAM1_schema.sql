-- IAM-1 Core Identity & Org Structure schema extension
set check_function_bodies = off;

-- Org role enum with precedence-aligned values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'org_role'
  ) THEN
    CREATE TYPE public.org_role AS ENUM (
      'SYSTEM_ADMIN',
      'PARTNER',
      'MANAGER',
      'EMPLOYEE',
      'CLIENT',
      'READONLY',
      'SERVICE_ACCOUNT',
      'EQR'
    );
  END IF;
END $$;

-- Team membership enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'team_role'
  ) THEN
    CREATE TYPE public.team_role AS ENUM ('LEAD', 'MEMBER', 'VIEWER');
  END IF;
END $$;

-- Invite status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'invite_status'
  ) THEN
    CREATE TYPE public.invite_status AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
  END IF;
END $$;

-- Theme enum for user preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'theme_preference'
  ) THEN
    CREATE TYPE public.theme_preference AS ENUM ('SYSTEM', 'LIGHT', 'DARK');
  END IF;
END $$;

-- Ensure organizations table has autopilot_level meta
ALTER TABLE IF EXISTS public.organizations
  ADD COLUMN IF NOT EXISTS autopilot_level integer NOT NULL DEFAULT 0;

-- User profile table storing organisation-agnostic profile data
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  email citext NOT NULL UNIQUE,
  phone_e164 text,
  whatsapp_e164 text,
  avatar_url text,
  locale text,
  timezone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed profiles for existing users (idempotent)
INSERT INTO public.user_profiles (id, display_name, email, phone_e164, whatsapp_e164, avatar_url, locale, timezone)
SELECT
  u.id,
  COALESCE(NULLIF(trim(u.name), ''), split_part(u.email, '@', 1)),
  u.email::citext,
  NULL,
  NULL,
  u.avatar_url,
  'en-US',
  'UTC'
FROM public.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
WHERE p.id IS NULL;

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Extend memberships table to align with IAM role model
ALTER TABLE IF EXISTS public.memberships
  ALTER COLUMN role TYPE public.org_role USING role::text::public.org_role;

ALTER TABLE IF EXISTS public.memberships
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Ensure memberships link to user_profiles as well
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'memberships_user_profile_fkey'
  ) THEN
    ALTER TABLE public.memberships
      ADD CONSTRAINT memberships_user_profile_fkey
      FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Team memberships
CREATE TABLE IF NOT EXISTS public.team_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role public.team_role NOT NULL DEFAULT 'MEMBER',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

-- Invitations issuing tokens for onboarding
CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email_or_phone text NOT NULL,
  role public.org_role NOT NULL,
  invited_by_user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status public.invite_status NOT NULL DEFAULT 'PENDING',
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User preferences captured per org
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  notifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  theme public.theme_preference NOT NULL DEFAULT 'SYSTEM',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id)
);

-- Ensure activity_log metadata indexes exist (idempotent helper for IAM events)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'activity_log' AND indexname = 'activity_log_org_created_at_idx'
  ) THEN
    CREATE INDEX activity_log_org_created_at_idx ON public.activity_log (org_id, created_at DESC);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'activity_log' AND indexname = 'activity_log_action_idx'
  ) THEN
    CREATE INDEX activity_log_action_idx ON public.activity_log (action);
  END IF;
END $$;

-- Trigger to keep updated_at fresh on user_profiles
CREATE OR REPLACE FUNCTION app.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_profiles_touch ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_touch
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

DROP TRIGGER IF EXISTS trg_user_preferences_touch ON public.user_preferences;
CREATE TRIGGER trg_user_preferences_touch
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();
