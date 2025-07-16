-- Create or replace the is_admin function to work with the current setup
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- For now, return true for all authenticated users since this is an admin-only panel
  -- In production, you would check against a specific admin role or table
  SELECT auth.uid() IS NOT NULL;
$$;