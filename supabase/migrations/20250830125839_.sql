-- Create helper functions now that tables exist
CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT auth.uid(); $$;

CREATE OR REPLACE FUNCTION app.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END; 
$$;

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

-- Add RLS policies for core tables
DROP POLICY IF EXISTS orgs_read ON organizations;
CREATE POLICY orgs_read ON organizations
  FOR SELECT USING (EXISTS (SELECT 1 FROM members m WHERE m.org_id = organizations.id AND m.user_id = app.current_user_id()));

DROP POLICY IF EXISTS app_users_self ON app_users;
CREATE POLICY app_users_self ON app_users
  FOR ALL USING (app_users.user_id = app.current_user_id())
  WITH CHECK (app_users.user_id = app.current_user_id());

DROP POLICY IF EXISTS members_read ON members;
CREATE POLICY members_read ON members
  FOR SELECT USING (
    members.user_id = app.current_user_id()
    OR EXISTS (SELECT 1 FROM members m WHERE m.org_id = members.org_id AND m.user_id = app.current_user_id() AND app.role_rank(m.role) >= 3)
  );
