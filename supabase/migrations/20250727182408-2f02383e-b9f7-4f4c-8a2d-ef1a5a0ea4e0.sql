-- SECURITY FIXES - FINAL ATTEMPT WITH CORRECT SYNTAX
-- Fix all critical security issues with proper PostgreSQL policy syntax

-- 1. SECURE CANONICAL LOCATIONS
DROP POLICY IF EXISTS "System can manage canonical locations" ON public.canonical_locations;

CREATE POLICY "Admin can insert canonical locations"
ON public.canonical_locations
FOR INSERT
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

-- 2. SECURE BUSINESSES
DROP POLICY IF EXISTS "Admin can view all businesses" ON public.businesses;
DROP POLICY IF EXISTS "System can manage all businesses" ON public.businesses;

CREATE POLICY "Admin can view all businesses"
ON public.businesses
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admin can insert businesses"
ON public.businesses
FOR INSERT
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

-- 3. SECURE SECURITY AUDIT LOG
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

-- 4. SECURE RATE LIMITS
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limit_tracker;

CREATE POLICY "Admin can view rate limits"
ON public.rate_limit_tracker
FOR SELECT
USING (public.is_admin());

CREATE POLICY "System can insert rate limits"
ON public.rate_limit_tracker
FOR INSERT
WITH CHECK (true);

-- 5. SECURE AGENT CONFIGS
DROP POLICY IF EXISTS "System can read agent configs" ON public.agent_configs;

CREATE POLICY "Admin can read agent configs"
ON public.agent_configs
FOR SELECT
USING (public.is_admin());

-- 6. SECURITY MONITORING FUNCTION
CREATE OR REPLACE FUNCTION public.get_security_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    result jsonb;
    tables_without_policies integer;
    recent_violations integer;
BEGIN
    SELECT COUNT(*)
    INTO tables_without_policies
    FROM information_schema.tables t
    JOIN pg_class c ON c.relname = t.table_name
    LEFT JOIN pg_policies p ON p.tablename = t.table_name
    WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND c.relrowsecurity = true
    AND p.policyname IS NULL;
    
    SELECT COUNT(*)
    INTO recent_violations
    FROM public.security_audit_log
    WHERE created_at > now() - interval '24 hours'
    AND severity IN ('high', 'critical');
    
    result := jsonb_build_object(
        'timestamp', now(),
        'tables_without_policies', tables_without_policies,
        'recent_violations_24h', recent_violations,
        'status', CASE 
            WHEN tables_without_policies <= 10 AND recent_violations = 0 THEN 'SECURE'
            WHEN recent_violations > 10 THEN 'CRITICAL'
            ELSE 'WARNING'
        END
    );
    
    RETURN result;
END;
$$;

-- 7. MINIMIZE ANONYMOUS ACCESS
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Grant only essential public access
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.canonical_locations TO anon;
GRANT SELECT ON public.unified_listings TO anon;
GRANT SELECT ON public.property_listings TO anon;
GRANT SELECT ON public.vehicle_listings TO anon;

-- 8. GRANT NECESSARY PERMISSIONS
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_bar_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_enhanced_rate_limit(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_suspicious_activity(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_security_monitoring_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_security_summary() TO authenticated;