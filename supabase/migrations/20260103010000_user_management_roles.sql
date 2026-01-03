-- =============================================================================
-- User Management & Roles Schema
-- =============================================================================
-- Implements role-based access control with invitation-only signup

-- User roles enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('SYSTEM_ADMIN', 'STAFF');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- User status enum
DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- User Profiles Table (extends auth.users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  
  -- Role and status
  role public.app_role NOT NULL DEFAULT 'STAFF',
  status public.user_status NOT NULL DEFAULT 'INVITED',
  
  -- Organization (optional multi-tenancy)
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  
  -- Metadata
  phone TEXT,
  job_title TEXT,
  department TEXT,
  
  -- Timestamps
  invited_at TIMESTAMPTZ DEFAULT now(),
  invited_by UUID REFERENCES auth.users(id),
  activated_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  suspended_by UUID REFERENCES auth.users(id),
  suspended_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique index on email
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_email_idx 
  ON public.user_profiles (email);

-- Create index on role for quick lookups
CREATE INDEX IF NOT EXISTS user_profiles_role_idx 
  ON public.user_profiles (role);

-- Create index on status
CREATE INDEX IF NOT EXISTS user_profiles_status_idx 
  ON public.user_profiles (status);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- User Invitations Table (for pending invites)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'STAFF',
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Invitation details
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invitation_token TEXT UNIQUE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
  
  -- Timestamps
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique pending invitation per email
CREATE UNIQUE INDEX IF NOT EXISTS user_invitations_pending_email_idx 
  ON public.user_invitations (email) WHERE status = 'PENDING';

-- Enable RLS
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS Policies for user_profiles
-- =============================================================================

-- Users can read their own profile
DROP POLICY IF EXISTS user_profiles_self_read ON public.user_profiles;
CREATE POLICY user_profiles_self_read ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (limited fields)
DROP POLICY IF EXISTS user_profiles_self_update ON public.user_profiles;
CREATE POLICY user_profiles_self_update ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- System admins can read all profiles
DROP POLICY IF EXISTS user_profiles_admin_read ON public.user_profiles;
CREATE POLICY user_profiles_admin_read ON public.user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() AND up.role = 'SYSTEM_ADMIN'
    )
  );

-- System admins can update all profiles
DROP POLICY IF EXISTS user_profiles_admin_update ON public.user_profiles;
CREATE POLICY user_profiles_admin_update ON public.user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() AND up.role = 'SYSTEM_ADMIN'
    )
  );

-- System admins can insert (for invitations)
DROP POLICY IF EXISTS user_profiles_admin_insert ON public.user_profiles;
CREATE POLICY user_profiles_admin_insert ON public.user_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() AND up.role = 'SYSTEM_ADMIN'
    )
  );

-- =============================================================================
-- RLS Policies for user_invitations
-- =============================================================================

-- System admins can manage invitations
DROP POLICY IF EXISTS user_invitations_admin_all ON public.user_invitations;
CREATE POLICY user_invitations_admin_all ON public.user_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() AND up.role = 'SYSTEM_ADMIN'
    )
  );

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Check if current user is system admin
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'SYSTEM_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.app_role AS $$
DECLARE
  user_role public.app_role;
BEGIN
  SELECT role INTO user_role 
  FROM public.user_profiles 
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'STAFF');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- Trigger: Auto-create profile on signup (from invitation)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  invitation RECORD;
BEGIN
  -- Check for pending invitation
  SELECT * INTO invitation
  FROM public.user_invitations
  WHERE email = NEW.email 
    AND status = 'PENDING'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF invitation.id IS NOT NULL THEN
    -- Create profile from invitation
    INSERT INTO public.user_profiles (
      id, email, role, status, 
      organization_id, invited_by, 
      invited_at, activated_at
    ) VALUES (
      NEW.id, 
      NEW.email, 
      invitation.role,
      'ACTIVE',
      invitation.organization_id,
      invitation.invited_by,
      invitation.created_at,
      now()
    );
    
    -- Mark invitation as accepted
    UPDATE public.user_invitations 
    SET status = 'ACCEPTED', accepted_at = now()
    WHERE id = invitation.id;
  ELSE
    -- No invitation found - reject signup or create as STAFF
    -- For invitation-only app, you may want to raise an error here
    INSERT INTO public.user_profiles (id, email, role, status)
    VALUES (NEW.id, NEW.email, 'STAFF', 'ACTIVE');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (drop if exists first)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- Trigger: Update last_login_at
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles 
  SET last_login_at = now()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Initial System Admin (seed)
-- =============================================================================
-- Note: Run this manually to create the first system admin
-- INSERT INTO public.user_profiles (id, email, role, status)
-- SELECT id, email, 'SYSTEM_ADMIN', 'ACTIVE'
-- FROM auth.users 
-- WHERE email = 'admin@yourcompany.com'
-- ON CONFLICT (id) DO UPDATE SET role = 'SYSTEM_ADMIN';
