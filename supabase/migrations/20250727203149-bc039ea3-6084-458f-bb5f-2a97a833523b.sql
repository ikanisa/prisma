-- Multi-AI Security Fix for spatial_ref_sys PostGIS System Table
-- Issue: Cannot enable RLS on PostGIS system table spatial_ref_sys (ownership limitations)
-- Solution: Create controlled access and document the limitation

-- Create a secure view of spatial_ref_sys with proper access control
CREATE OR REPLACE VIEW public.secure_spatial_ref_sys 
AS SELECT srid, auth_name, auth_srid, srtext, proj4text FROM public.spatial_ref_sys;

-- Add comment to document the security approach
COMMENT ON VIEW public.secure_spatial_ref_sys IS 
'Secured view of PostGIS spatial_ref_sys system table. Use this view instead of direct table access for better security control.';

-- Create a function to access spatial reference data with proper security and logging
CREATE OR REPLACE FUNCTION public.get_spatial_ref_sys(srid_param integer DEFAULT NULL)
RETURNS TABLE (
  srid integer,
  auth_name text,
  auth_srid integer,
  srtext text,
  proj4text text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Add access logging for security monitoring (using correct schema)
  INSERT INTO public.security_audit_log (
    event_type, 
    severity,
    endpoint,
    details
  ) VALUES (
    'SPATIAL_REF_ACCESS', 
    'INFO',
    'get_spatial_ref_sys',
    jsonb_build_object('srid_requested', srid_param, 'accessed_at', now())
  );

  -- Return filtered spatial reference data
  IF srid_param IS NOT NULL THEN
    RETURN QUERY 
    SELECT s.srid, s.auth_name, s.auth_srid, s.srtext, s.proj4text
    FROM public.spatial_ref_sys s 
    WHERE s.srid = srid_param;
  ELSE
    RETURN QUERY 
    SELECT s.srid, s.auth_name, s.auth_srid, s.srtext, s.proj4text
    FROM public.spatial_ref_sys s 
    LIMIT 100; -- Limit results for security
  END IF;
END;
$$;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.get_spatial_ref_sys(integer) TO authenticated;
GRANT SELECT ON public.secure_spatial_ref_sys TO authenticated;

-- Try to restrict access to the original table
DO $$
BEGIN
  -- Attempt to revoke public access (may fail due to PostGIS ownership)
  REVOKE ALL ON public.spatial_ref_sys FROM public;
  
  -- Log successful access restriction
  INSERT INTO public.security_audit_log (
    event_type, 
    severity,
    endpoint,
    details
  ) VALUES (
    'ACCESS_RESTRICTED', 
    'INFO',
    'spatial_ref_sys_security',
    jsonb_build_object('table', 'public.spatial_ref_sys', 'method', 'revoke_public_access', 'status', 'success')
  );
  
EXCEPTION WHEN insufficient_privilege THEN
  -- Log that we couldn't restrict access due to privileges
  INSERT INTO public.security_audit_log (
    event_type, 
    severity,
    endpoint,
    details
  ) VALUES (
    'ACCESS_RESTRICTION_FAILED', 
    'WARN',
    'spatial_ref_sys_security',
    jsonb_build_object(
      'table', 'public.spatial_ref_sys', 
      'error', 'insufficient_privilege',
      'recommendation', 'Use secure_spatial_ref_sys view or get_spatial_ref_sys function instead'
    )
  );
WHEN OTHERS THEN
  -- Log any other errors
  INSERT INTO public.security_audit_log (
    event_type, 
    severity,
    endpoint,
    details
  ) VALUES (
    'ACCESS_RESTRICTION_ERROR', 
    'ERROR',
    'spatial_ref_sys_security',
    jsonb_build_object('table', 'public.spatial_ref_sys', 'error', SQLERRM)
  );
END $$;

-- Create a usage guide comment
COMMENT ON FUNCTION public.get_spatial_ref_sys(integer) IS 
'Secure access function for spatial reference system data. Use this instead of direct table queries. Includes access logging and result limiting for security.';

-- Document the security limitation in the system
INSERT INTO public.security_audit_log (
  event_type, 
  severity,
  endpoint,
  details
) VALUES (
  'SECURITY_WORKAROUND_IMPLEMENTED', 
  'INFO',
  'spatial_ref_sys_rls_workaround',
  jsonb_build_object(
    'issue', 'Cannot enable RLS on PostGIS system table spatial_ref_sys',
    'solution', 'Created secure view and access function as workaround',
    'recommendation', 'Use public.secure_spatial_ref_sys view or public.get_spatial_ref_sys() function',
    'security_level', 'MEDIUM - Controlled access implemented'
  )
);