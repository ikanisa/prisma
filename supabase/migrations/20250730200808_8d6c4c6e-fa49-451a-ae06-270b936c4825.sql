-- Fix security issues: Set search_path for existing functions with SECURITY DEFINER
-- This prevents SQL injection via search_path manipulation

-- Only alter functions that actually exist in the database
-- Skip functions that don't exist to avoid errors

-- Core system functions that exist
ALTER FUNCTION public.trigger_automated_review() SET search_path = '';
ALTER FUNCTION public.is_admin() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

-- Note: Only fixing functions that exist in the current database
-- spatial_ref_sys is a PostGIS system table and should remain without RLS
-- It contains read-only coordinate system definitions needed for spatial operations