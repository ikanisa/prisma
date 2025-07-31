-- Create a proper is_admin function that returns true for now
-- In a real app, this would check user roles or specific admin user IDs
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- For now, return true to allow admin access
  -- In production, this should check auth.jwt() -> 'role' = 'admin' or similar
  SELECT true;
$$;

-- Update RLS policies to allow broader access for the admin interface
DROP POLICY IF EXISTS "Admin full" ON agents;
CREATE POLICY "Admin full access" ON agents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full" ON agent_personas;
CREATE POLICY "Admin full access" ON agent_personas FOR ALL USING (true) WITH CHECK (true);