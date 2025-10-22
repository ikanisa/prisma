-- Fix critical security issues for production readiness

-- 1. Fix all functions missing search_path (CRITICAL SECURITY ISSUE)
-- These functions are already security definers but need search_path set

-- Fix is_member_of function
CREATE OR REPLACE FUNCTION public.is_member_of(org uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.org_id = org AND m.user_id = auth.uid()
  );
$$;

-- Fix has_min_role function  
CREATE OR REPLACE FUNCTION public.has_min_role(org uuid, min role_level)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_role AS (
    SELECT m.role
    FROM public.memberships m
    WHERE m.org_id = org AND m.user_id = auth.uid()
    LIMIT 1
  )
  SELECT COALESCE(
    (SELECT CASE
      WHEN (SELECT role FROM my_role) = 'SYSTEM_ADMIN' THEN true
      WHEN (SELECT role FROM my_role) = 'MANAGER' AND min IN ('EMPLOYEE', 'MANAGER') THEN true
      WHEN (SELECT role FROM my_role) = 'EMPLOYEE' AND min = 'EMPLOYEE' THEN true
      ELSE false 
    END),
    false
  );
$$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Fix handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix enforce_rate_limit function
CREATE OR REPLACE FUNCTION public.enforce_rate_limit(p_org_id uuid, p_resource text, p_limit integer, p_window_seconds integer)
RETURNS TABLE(allowed boolean, request_count integer)
LANGUAGE plpgsql
SET search_path = public
AS $$
declare
  v_window_start timestamptz := date_trunc('second', now()) - make_interval(secs => mod(extract(epoch from now())::integer, p_window_seconds));
  v_count integer;
begin
  insert into public.rate_limits(org_id, resource, window_start, request_count)
  values (p_org_id, p_resource, v_window_start, 1)
  on conflict (org_id, resource, window_start)
  do update set request_count = public.rate_limits.request_count + 1
  returning request_count into v_count;

  return query select (v_count <= p_limit) as allowed, v_count;
end;
$$;

-- 2. Restrict users table to prevent email harvesting (CRITICAL)
-- Users can only view their own profile or if they're system admin
DROP POLICY IF EXISTS users_select_self ON public.users;
CREATE POLICY users_select_self
  ON public.users
  FOR SELECT
  USING (auth.uid() = id OR is_system_admin = true);

DROP POLICY IF EXISTS users_update_self ON public.users;
CREATE POLICY users_update_self
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- System admins can manage all users (already exists but ensure it's there)
DROP POLICY IF EXISTS users_admin_manage ON public.users;
CREATE POLICY users_admin_manage
  ON public.users
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_system_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_system_admin));

-- 3. Add index for better performance on org membership checks
CREATE INDEX IF NOT EXISTS idx_memberships_user_org ON public.memberships(user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_users_system_admin ON public.users(is_system_admin) WHERE is_system_admin = true;