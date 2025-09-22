-- Create helper functions for security audit

-- Function to get RLS status of all tables
CREATE OR REPLACE FUNCTION get_rls_status()
RETURNS TABLE(table_name text, rls_enabled boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.relname::text as table_name,
    c.relrowsecurity as rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname NOT LIKE 'pg_%'
    AND c.relname NOT LIKE 'sql_%'
  ORDER BY c.relname;
$$;

-- Function to get security functions info
CREATE OR REPLACE FUNCTION get_security_functions()
RETURNS TABLE(
  function_name text, 
  security_type text,
  has_search_path boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.proname::text as function_name,
    CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END as security_type,
    p.proconfig IS NOT NULL as has_search_path
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
  ORDER BY p.proname;
$$;

-- Function to check if a function exists
CREATE OR REPLACE FUNCTION check_function_exists(function_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = function_name
  );
$$;