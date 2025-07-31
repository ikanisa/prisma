-- CRITICAL SECURITY HARDENING - WORKING VERSION
-- Apply essential security fixes only

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

-- 4. SECURE RATE LIMIT TRACKER
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

-- 6. MINIMIZE ANONYMOUS ACCESS
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Grant only essential public data access
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.canonical_locations TO anon;
GRANT SELECT ON public.unified_listings TO anon;
GRANT SELECT ON public.property_listings TO anon;
GRANT SELECT ON public.vehicle_listings TO anon;

-- 7. GRANT ESSENTIAL FUNCTION PERMISSIONS
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_bar_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_enhanced_rate_limit(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_suspicious_activity(uuid, integer) TO authenticated;