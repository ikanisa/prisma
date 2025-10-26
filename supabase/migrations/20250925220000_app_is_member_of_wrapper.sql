-- Ensure legacy RLS helpers resolve against the new org-role helpers
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.is_member_of(
  p_org uuid,
  p_min_role text DEFAULT 'staff'
) RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = app, public
AS $$
  SELECT app.is_org_member(p_org, p_min_role::org_role);
$$;
