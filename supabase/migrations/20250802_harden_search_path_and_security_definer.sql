-- Harden Supabase Functions: enforce search_path and SECURITY DEFINER on edge functions
-- Note: Supabase migrations for edge functions are not automatic; deploy this via SQL editor

ALTER FUNCTION public.is_admin(uuid)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin(uuid)
  SECURITY DEFINER;

-- Add similar statements for other RPC functions below:
-- ALTER FUNCTION public.another_function(...) SET search_path = public, pg_temp;
-- ALTER FUNCTION public.another_function(...) SECURITY DEFINER;
