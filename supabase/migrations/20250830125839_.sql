-- Create helper functions now that tables exist
CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = app, public
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION app.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = app, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app.role_rank(role_in org_role)
RETURNS int
LANGUAGE sql
IMMUTABLE
SET search_path = app, public
AS $$
  SELECT CASE role_in
    WHEN 'admin' THEN 4
    WHEN 'manager' THEN 3
    WHEN 'staff' THEN 2
    WHEN 'client' THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION app.is_org_member(p_org uuid, p_min_role org_role DEFAULT 'staff')
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = app, public
AS $$
  SELECT public.has_min_role(
    p_org,
    CASE p_min_role
      WHEN 'admin' THEN 'SYSTEM_ADMIN'::public.role_level
      WHEN 'manager' THEN 'MANAGER'::public.role_level
      WHEN 'staff' THEN 'EMPLOYEE'::public.role_level
      WHEN 'client' THEN 'EMPLOYEE'::public.role_level
      ELSE 'EMPLOYEE'::public.role_level
    END
  );
$$;

CREATE OR REPLACE FUNCTION app.is_org_admin(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = app, public
AS $$
  SELECT public.has_min_role(p_org, 'SYSTEM_ADMIN'::public.role_level);
$$;

-- Align RLS policies with public schema
DROP POLICY IF EXISTS orgs_read ON public.organizations;
CREATE POLICY orgs_read ON public.organizations
  FOR SELECT USING (public.is_member_of(id));

DROP POLICY IF EXISTS users_self ON public.users;
CREATE POLICY users_self ON public.users
  FOR ALL USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS memberships_read ON public.memberships;
CREATE POLICY memberships_read ON public.memberships
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.has_min_role(org_id, 'MANAGER'::public.role_level)
  );
