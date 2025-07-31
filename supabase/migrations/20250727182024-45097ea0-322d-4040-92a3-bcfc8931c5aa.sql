-- COMPREHENSIVE SECURITY FIXES - PHASE 2
-- Continue fixing remaining critical security issues

-- 1. CREATE MISSING RLS POLICIES FOR REMAINING TABLES
-- These tables have RLS enabled but no policies

-- experiment_assignments table
CREATE POLICY "System can manage experiment_assignments"
ON public.experiment_assignments
FOR ALL
USING (true)
WITH CHECK (true);

-- farmers table
CREATE POLICY "Farmers can manage own profile"
ON public.farmers
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can manage farmers"
ON public.farmers
FOR ALL
USING (true)
WITH CHECK (true);

-- farms table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'farms') THEN
        EXECUTE 'CREATE POLICY "Farmers can manage own farms" ON public.farms FOR ALL USING (farmer_id = auth.uid()) WITH CHECK (farmer_id = auth.uid())';
        EXECUTE 'CREATE POLICY "System can manage farms" ON public.farms FOR ALL USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- fine_tune_jobs table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fine_tune_jobs') THEN
        EXECUTE 'CREATE POLICY "System can manage fine_tune_jobs" ON public.fine_tune_jobs FOR ALL USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- fulfilment_providers table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fulfilment_providers') THEN
        EXECUTE 'CREATE POLICY "System can manage fulfilment_providers" ON public.fulfilment_providers FOR ALL USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- global_search_index table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'global_search_index') THEN
        EXECUTE 'CREATE POLICY "Public can search global_search_index" ON public.global_search_index FOR SELECT USING (true)';
    END IF;
END $$;

-- hardware_prices table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hardware_prices') THEN
        EXECUTE 'CREATE POLICY "Public can view hardware_prices" ON public.hardware_prices FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "System can manage hardware_prices" ON public.hardware_prices FOR ALL USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- knowledge_base table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'knowledge_base') THEN
        EXECUTE 'CREATE POLICY "System can manage knowledge_base" ON public.knowledge_base FOR ALL USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- Fix the is_bar_staff function that some policies reference
CREATE OR REPLACE FUNCTION public.is_bar_staff(bar_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.businesses 
        WHERE id = bar_id 
        AND owner_user_id = auth.uid()
    );
$$;

-- 2. TIGHTEN ANONYMOUS ACCESS POLICIES
-- Replace overly permissive anonymous policies with proper authentication checks

-- Update agent_configs policy
DROP POLICY IF EXISTS "System can read agent configs" ON public.agent_configs;
CREATE POLICY "Admin can read agent configs"
ON public.agent_configs
FOR SELECT
USING (public.is_admin());

-- Update canonical_locations to require authentication for management
DROP POLICY IF EXISTS "System can manage canonical locations" ON public.canonical_locations;
CREATE POLICY "Admin can manage canonical locations"
ON public.canonical_locations
FOR INSERT, UPDATE, DELETE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Update businesses policies to be more restrictive
DROP POLICY IF EXISTS "Admin can view all businesses" ON public.businesses;
DROP POLICY IF EXISTS "System can manage all businesses" ON public.businesses;

CREATE POLICY "Admin can view all businesses"
ON public.businesses
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admin can manage all businesses"
ON public.businesses
FOR INSERT, UPDATE, DELETE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 3. CREATE ADMIN-ONLY POLICIES FOR SYSTEM TABLES
-- These should only be accessible to admins, not anonymous users

-- Security audit log - only admins should see this
DROP POLICY IF EXISTS "Admin can view security audit log" ON public.security_audit_log;
DROP POLICY IF EXISTS "System can insert security audit log" ON public.security_audit_log;

CREATE POLICY "Admin can view security audit log"
ON public.security_audit_log
FOR SELECT
USING (public.is_admin());

CREATE POLICY "System can insert security audit log"
ON public.security_audit_log
FOR INSERT
WITH CHECK (true);  -- Allow system to log events

-- Update rate_limit_tracker to be admin-only for viewing
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limit_tracker;

CREATE POLICY "Admin can view rate limits"
ON public.rate_limit_tracker
FOR SELECT
USING (public.is_admin());

CREATE POLICY "System can insert rate limits"
ON public.rate_limit_tracker
FOR INSERT
WITH CHECK (true);

-- 4. FIX REMAINING FUNCTION SEARCH PATHS
-- Add proper search_path to remaining functions that need it

-- Fix any remaining functions missing search_path
UPDATE pg_proc 
SET proconfig = array_append(proconfig, 'search_path=')
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND prosecdef = true
AND (proconfig IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(proconfig) AS config 
    WHERE config LIKE 'search_path=%'
));

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_bar_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_enhanced_rate_limit(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_suspicious_activity(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_security_monitoring_data() TO authenticated;

-- Revoke unnecessary permissions from anon
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Grant only minimal necessary permissions to anon
GRANT SELECT ON public.canonical_locations TO anon;
GRANT SELECT ON public.unified_listings TO anon;
GRANT SELECT ON public.property_listings TO anon;
GRANT SELECT ON public.vehicle_listings TO anon;