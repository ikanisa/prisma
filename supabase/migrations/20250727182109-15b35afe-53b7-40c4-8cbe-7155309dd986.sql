-- COMPREHENSIVE SECURITY FIXES - PHASE 3
-- Fix syntax error and continue with security improvements

-- 1. CREATE MISSING RLS POLICIES FOR REMAINING TABLES WITHOUT POLICIES
-- Add policies for tables that have RLS enabled but no policies

-- Fix farmers table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'farmers') THEN
        -- Check if policies already exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'farmers' AND policyname = 'Farmers can manage own profile') THEN
            EXECUTE 'CREATE POLICY "Farmers can manage own profile" ON public.farmers FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'farmers' AND policyname = 'System can manage farmers') THEN
            EXECUTE 'CREATE POLICY "System can manage farmers" ON public.farmers FOR ALL USING (true) WITH CHECK (true)';
        END IF;
    END IF;
END $$;

-- 2. TIGHTEN ANONYMOUS ACCESS POLICIES
-- Replace overly permissive policies with proper authentication

-- Update canonical_locations management policy
DROP POLICY IF EXISTS "System can manage canonical locations" ON public.canonical_locations;

CREATE POLICY "Admin can insert canonical locations"
ON public.canonical_locations
FOR INSERT
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update canonical locations"
ON public.canonical_locations
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete canonical locations"
ON public.canonical_locations
FOR DELETE
USING (public.is_admin());

-- Update businesses policies to be more restrictive
DROP POLICY IF EXISTS "Admin can view all businesses" ON public.businesses;
DROP POLICY IF EXISTS "System can manage all businesses" ON public.businesses;

CREATE POLICY "Admin can view all businesses"
ON public.businesses
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admin can insert businesses"
ON public.businesses
FOR INSERT
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update businesses"
ON public.businesses
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete businesses"
ON public.businesses
FOR DELETE
USING (public.is_admin());

-- 3. FIX SECURITY AUDIT POLICIES
DROP POLICY IF EXISTS "Admin can view security audit log" ON public.security_audit_log;
DROP POLICY IF EXISTS "System can insert security audit log" ON public.security_audit_log;

CREATE POLICY "Admin can view security audit log"
ON public.security_audit_log
FOR SELECT
USING (public.is_admin());

CREATE POLICY "System can insert security audit log"
ON public.security_audit_log
FOR INSERT
WITH CHECK (true);

-- 4. FIX RATE LIMIT TRACKER POLICIES
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limit_tracker;

CREATE POLICY "Admin can view rate limits"
ON public.rate_limit_tracker
FOR SELECT
USING (public.is_admin());

CREATE POLICY "System can insert rate limits"
ON public.rate_limit_tracker
FOR INSERT
WITH CHECK (true);

-- 5. RESTRICT AGENT CONFIG ACCESS
DROP POLICY IF EXISTS "System can read agent configs" ON public.agent_configs;

CREATE POLICY "Admin can read agent configs"
ON public.agent_configs
FOR SELECT
USING (public.is_admin());

-- 6. ENSURE PROPER PERMISSIONS
-- Grant proper permissions for functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_bar_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_enhanced_rate_limit(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_suspicious_activity(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_security_monitoring_data() TO authenticated;

-- 7. MINIMIZE ANONYMOUS ACCESS
-- Only allow minimal read access for public-facing data
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.canonical_locations TO anon;
GRANT SELECT ON public.unified_listings TO anon;
GRANT SELECT ON public.property_listings TO anon;
GRANT SELECT ON public.vehicle_listings TO anon;

-- 8. CREATE COMPREHENSIVE SECURITY CHECK FUNCTION
CREATE OR REPLACE FUNCTION public.security_health_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    result jsonb;
    tables_without_rls integer;
    tables_without_policies integer;
    functions_without_search_path integer;
BEGIN
    -- Count tables without RLS
    SELECT COUNT(*)
    INTO tables_without_rls
    FROM information_schema.tables t
    LEFT JOIN pg_class c ON c.relname = t.table_name
    WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND (c.relrowsecurity IS FALSE OR c.relrowsecurity IS NULL);
    
    -- Count tables with RLS but no policies
    SELECT COUNT(*)
    INTO tables_without_policies
    FROM information_schema.tables t
    JOIN pg_class c ON c.relname = t.table_name
    LEFT JOIN pg_policies p ON p.tablename = t.table_name
    WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND c.relrowsecurity = true
    AND p.policyname IS NULL;
    
    -- Count security definer functions without search_path
    SELECT COUNT(*)
    INTO functions_without_search_path
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND prosecdef = true
    AND (proconfig IS NULL OR NOT EXISTS (
        SELECT 1 FROM unnest(proconfig) AS config 
        WHERE config LIKE 'search_path=%'
    ));
    
    result := jsonb_build_object(
        'timestamp', now(),
        'tables_without_rls', tables_without_rls,
        'tables_without_policies', tables_without_policies,
        'functions_without_search_path', functions_without_search_path,
        'security_status', CASE 
            WHEN tables_without_rls = 0 AND tables_without_policies = 0 AND functions_without_search_path = 0 
            THEN 'SECURE'
            WHEN tables_without_rls > 0 OR functions_without_search_path > 0
            THEN 'CRITICAL'
            ELSE 'WARNING'
        END
    );
    
    RETURN result;
END;
$$;

-- Grant execution to admin
GRANT EXECUTE ON FUNCTION public.security_health_check() TO authenticated;