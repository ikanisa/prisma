-- SECURITY FIXES - PHASE 1: Fix Critical Database Issues (Revised)

-- 1. Drop and recreate is_admin() function with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- Create corrected is_admin() function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- 2. Fix user_roles RLS policies to prevent infinite recursion
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Create safe policies for user_roles without recursion
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Service role can manage roles" 
ON public.user_roles 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- 3. Secure PostGIS spatial_ref_sys table
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System access only for spatial_ref_sys" 
ON public.spatial_ref_sys 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- 4. Create security audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    source_ip text,
    user_agent text,
    user_id uuid,
    phone_number text,
    table_name text,
    action_attempted text,
    policy_violated text,
    additional_context jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view security audit log" 
ON public.security_audit_log 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "System can insert security audit log" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (true);

-- 5. Enhanced rate limiting with security logging
CREATE OR REPLACE FUNCTION public.check_enhanced_rate_limit(
    p_identifier text,
    p_action text,
    p_max_requests integer DEFAULT 100,
    p_window_minutes integer DEFAULT 60
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_count integer;
    window_start timestamp with time zone;
BEGIN
    window_start := now() - (p_window_minutes || ' minutes')::interval;
    
    -- Count recent requests
    SELECT COUNT(*)
    INTO current_count
    FROM public.rate_limit_tracker
    WHERE identifier = p_identifier
    AND action_type = p_action
    AND created_at > window_start;
    
    -- Check if limit exceeded
    IF current_count >= p_max_requests THEN
        -- Log rate limit violation
        INSERT INTO public.security_audit_log (
            event_type, severity, user_id, table_name, action_attempted, 
            policy_violated, additional_context
        ) VALUES (
            'rate_limit_exceeded', 'medium', auth.uid(), 'rate_limit_tracker', p_action,
            'rate_limit_policy', jsonb_build_object(
                'identifier', p_identifier, 'current_count', current_count,
                'max_requests', p_max_requests, 'window_minutes', p_window_minutes
            )
        );
        RETURN false;
    END IF;
    
    -- Record this request
    INSERT INTO public.rate_limit_tracker (identifier, action_type, ip_address)
    VALUES (p_identifier, p_action, '127.0.0.1');
    
    RETURN true;
END;
$$;

-- 6. Create security monitoring view
CREATE OR REPLACE VIEW public.security_monitoring_dashboard AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour_bucket,
    event_type,
    severity,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users_affected,
    COUNT(DISTINCT source_ip) as unique_ips
FROM public.security_audit_log
WHERE created_at >= now() - interval '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), event_type, severity
ORDER BY hour_bucket DESC, event_count DESC;

-- Grant permissions
GRANT SELECT ON public.security_monitoring_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_enhanced_rate_limit TO authenticated;