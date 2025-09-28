-- Enable RLS and define least-privilege policies
-- This migration ensures row level security is enabled and only
-- the authenticated user or system administrators can access
-- specific rows.

-- Enable RLS on users table
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

-- Policy allowing a user to view their own profile
DROP POLICY IF EXISTS users_select_self ON public.users;
CREATE POLICY users_select_self
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy allowing a user to update their own profile
DROP POLICY IF EXISTS users_update_self ON public.users;
CREATE POLICY users_update_self
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy allowing system administrators to manage all users
DROP POLICY IF EXISTS users_admin_manage ON public.users;
CREATE POLICY users_admin_manage
  ON public.users
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_system_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_system_admin));
