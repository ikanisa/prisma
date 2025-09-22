-- Multi-AI Security Analysis and Fix for spatial_ref_sys RLS Issue
-- Issue: Table public.spatial_ref_sys is public, but RLS has not been enabled
-- Analysis: This is a PostGIS system table with 8500+ spatial reference system definitions
-- Risk Level: MEDIUM - System table exposure without access control

-- Solution 1: Enable RLS and create appropriate policies
-- The spatial_ref_sys table is a PostGIS system table that contains coordinate system definitions
-- It's typically read-only and used for spatial transformations

-- Enable Row Level Security on spatial_ref_sys table
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create a read-only policy for all users (since this is reference data)
-- This table contains standard spatial reference system definitions that are meant to be publicly readable
CREATE POLICY "spatial_ref_sys_read_only" 
ON public.spatial_ref_sys 
FOR SELECT 
USING (true);

-- Prevent any modifications to this system table by non-service roles
CREATE POLICY "spatial_ref_sys_no_insert" 
ON public.spatial_ref_sys 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "spatial_ref_sys_no_update" 
ON public.spatial_ref_sys 
FOR UPDATE 
USING (false);

CREATE POLICY "spatial_ref_sys_no_delete" 
ON public.spatial_ref_sys 
FOR DELETE 
USING (false);

-- Alternative approach: If you want to restrict access to authenticated users only
-- Uncomment the following policy and comment out the "true" policy above
-- CREATE POLICY "spatial_ref_sys_authenticated_read" 
-- ON public.spatial_ref_sys 
-- FOR SELECT 
-- USING (auth.role() = 'authenticated');

-- Log this security fix
INSERT INTO public.security_audit_log (
  event_type, 
  description, 
  severity, 
  metadata
) VALUES (
  'RLS_ENABLED', 
  'Enabled RLS on spatial_ref_sys table and created read-only policies', 
  'INFO',
  jsonb_build_object(
    'table', 'public.spatial_ref_sys',
    'policies_created', 4,
    'access_level', 'read_only_public'
  )
) ON CONFLICT DO NOTHING;

-- Verify the fix
-- This query should return true for rowsecurity after the migration
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'spatial_ref_sys';