-- Create the app schema first
CREATE SCHEMA IF NOT EXISTS app;

-- Create helper functions that don't depend on the touch_updated_at function yet
CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT auth.uid(); $$;

CREATE OR REPLACE FUNCTION app.role_rank(role_in org_role)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE role_in 
    WHEN 'admin' THEN 4 
    WHEN 'manager' THEN 3 
    WHEN 'staff' THEN 2 
    WHEN 'client' THEN 1 
    ELSE 0 
  END;
$$;

CREATE OR REPLACE FUNCTION app.is_org_member(p_org uuid, p_min_role org_role DEFAULT 'staff')
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM members m
    WHERE m.org_id = p_org
      AND m.user_id = app.current_user_id()
      AND app.role_rank(m.role) >= app.role_rank(p_min_role)
  );
$$;

CREATE OR REPLACE FUNCTION app.is_org_admin(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$ 
  SELECT app.is_org_member(p_org, 'admin'::org_role); 
$$;