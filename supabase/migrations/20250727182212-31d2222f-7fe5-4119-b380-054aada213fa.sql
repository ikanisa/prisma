-- FINAL COMPREHENSIVE SECURITY FIXES
-- Fix only verified security issues without making assumptions about table structure

-- 1. TIGHTEN ANONYMOUS ACCESS POLICIES
-- Replace overly permissive policies with proper authentication requirements

-- Update canonical_locations management (keep read access for anon)
DROP POLICY IF EXISTS "System can manage canonical locations" ON public.canonical_locations;

CREATE POLICY "Admin can manage canonical locations"
ON public.canonical_locations
FOR INSERT, UPDATE, DELETE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Update businesses to be admin-only for management
DROP POLICY IF EXISTS "Admin can view all businesses" ON public.businesses;
DROP POLICY IF EXISTS "System can manage all businesses" ON public.businesses;

CREATE POLICY "Admin can view all businesses"
ON public.businesses
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admin can manage businesses"
ON public.businesses
FOR INSERT, UPDATE, DELETE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 2. FIX SECURITY AUDIT LOG ACCESS
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

-- 3. FIX RATE LIMIT TRACKER ACCESS
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limit_tracker;

CREATE POLICY "Admin can view rate limits"
ON public.rate_limit_tracker
FOR SELECT
USING (public.is_admin());

CREATE POLICY "System can insert rate limits"
ON public.rate_limit_tracker
FOR INSERT
WITH CHECK (true);

-- 4. RESTRICT AGENT CONFIG ACCESS TO ADMINS
DROP POLICY IF EXISTS "System can read agent configs" ON public.agent_configs;

CREATE POLICY "Admin can read agent configs"
ON public.agent_configs
FOR SELECT
USING (public.is_admin());

-- 5. CREATE COMPREHENSIVE SECURITY MONITORING FUNCTION
CREATE OR REPLACE FUNCTION public.get_security_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    result jsonb;
    tables_without_rls integer;
    tables_without_policies integer;
    recent_violations integer;
BEGIN
    -- Count tables without RLS in public schema
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
    
    -- Count recent security violations (last 24 hours)
    SELECT COUNT(*)
    INTO recent_violations
    FROM public.security_audit_log
    WHERE created_at > now() - interval '24 hours'
    AND severity IN ('high', 'critical');
    
    result := jsonb_build_object(
        'timestamp', now(),
        'tables_without_rls', tables_without_rls,
        'tables_without_policies', tables_without_policies,
        'recent_violations_24h', recent_violations,
        'overall_status', CASE 
            WHEN tables_without_rls = 0 AND tables_without_policies <= 5 AND recent_violations = 0 
            THEN 'SECURE'
            WHEN tables_without_rls > 0 OR recent_violations > 10
            THEN 'CRITICAL'
            ELSE 'WARNING'
        END
    );
    
    RETURN result;
END;
$$;

-- 6. MINIMIZE ANONYMOUS PERMISSIONS
-- Revoke all permissions from anon and grant only essential ones
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Grant minimal read-only access for public data
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.canonical_locations TO anon;
GRANT SELECT ON public.unified_listings TO anon;
GRANT SELECT ON public.property_listings TO anon;
GRANT SELECT ON public.vehicle_listings TO anon;

-- 7. ENSURE PROPER FUNCTION PERMISSIONS
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_bar_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_enhanced_rate_limit(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_suspicious_activity(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_security_monitoring_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_security_summary() TO authenticated;

-- 8. CREATE AUTOMATED SECURITY ALERT TRIGGER
CREATE OR REPLACE FUNCTION public.trigger_security_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Log critical security events
    IF NEW.severity = 'critical' THEN
        -- In a real system, this would send notifications
        RAISE NOTICE 'CRITICAL SECURITY ALERT: % - %', NEW.event_type, NEW.additional_context;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for security alerts
DROP TRIGGER IF EXISTS security_alert_trigger ON public.security_audit_log;
CREATE TRIGGER security_alert_trigger
    AFTER INSERT ON public.security_audit_log
    FOR EACH ROW
    WHEN (NEW.severity = 'critical')
    EXECUTE FUNCTION public.trigger_security_alert();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.trigger_security_alert() TO authenticated;