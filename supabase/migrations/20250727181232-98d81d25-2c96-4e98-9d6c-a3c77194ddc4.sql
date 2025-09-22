-- SECURITY FIXES - PHASE 1: Critical Database Issues

-- 1. Fix is_admin() function to use user_roles table instead of non-existent profiles
DROP FUNCTION IF EXISTS public.is_admin();
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

-- 2. Fix infinite recursion in user_roles RLS policy
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Create safe policies for user_roles without recursion
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Only service role can manage roles" 
ON public.user_roles 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- 3. Secure PostGIS spatial_ref_sys table
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only system can access spatial_ref_sys" 
ON public.spatial_ref_sys 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- 4. Create security audit log table for policy violations
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

-- 5. Create function to log RLS policy violations
CREATE OR REPLACE FUNCTION public.log_rls_violation(
    p_table_name text,
    p_action text,
    p_policy_name text DEFAULT NULL,
    p_context jsonb DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.security_audit_log (
        event_type,
        severity,
        source_ip,
        user_agent,
        user_id,
        table_name,
        action_attempted,
        policy_violated,
        additional_context
    ) VALUES (
        'rls_policy_violation',
        'high',
        current_setting('request.headers', true)::json->>'x-real-ip',
        current_setting('request.headers', true)::json->>'user-agent',
        auth.uid(),
        p_table_name,
        p_action,
        COALESCE(p_policy_name, 'unknown_policy'),
        p_context
    );
END;
$$;

-- 6. Create function to validate and sanitize security-sensitive operations
CREATE OR REPLACE FUNCTION public.validate_security_operation(
    p_operation text,
    p_table_name text,
    p_user_context jsonb DEFAULT '{}'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_valid boolean := false;
    threat_score integer := 0;
BEGIN
    -- Basic validation
    IF p_operation IS NULL OR p_table_name IS NULL THEN
        PERFORM public.log_rls_violation(p_table_name, p_operation, 'invalid_parameters');
        RETURN false;
    END IF;
    
    -- Check for suspicious patterns
    IF p_operation ILIKE '%script%' OR p_operation ILIKE '%<script%' THEN
        threat_score := threat_score + 50;
    END IF;
    
    IF p_operation ILIKE '%union%' OR p_operation ILIKE '%select%' THEN
        threat_score := threat_score + 30;
    END IF;
    
    -- Log high threat score attempts
    IF threat_score >= 30 THEN
        PERFORM public.log_rls_violation(
            p_table_name, 
            p_operation, 
            'suspicious_pattern_detected',
            jsonb_build_object('threat_score', threat_score, 'user_context', p_user_context)
        );
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$;

-- 7. Create enhanced rate limiting function
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
        PERFORM public.log_rls_violation(
            'rate_limit_tracker',
            p_action,
            'rate_limit_exceeded',
            jsonb_build_object(
                'identifier', p_identifier,
                'current_count', current_count,
                'max_requests', p_max_requests,
                'window_minutes', p_window_minutes
            )
        );
        RETURN false;
    END IF;
    
    -- Record this request
    INSERT INTO public.rate_limit_tracker (identifier, action_type, ip_address)
    VALUES (p_identifier, p_action, current_setting('request.headers', true)::json->>'x-real-ip');
    
    RETURN true;
END;
$$;

-- 8. Create comprehensive security monitoring view
CREATE OR REPLACE VIEW public.security_monitoring_dashboard AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour_bucket,
    event_type,
    severity,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users_affected,
    COUNT(DISTINCT source_ip) as unique_ips,
    array_agg(DISTINCT table_name) FILTER (WHERE table_name IS NOT NULL) as affected_tables
FROM public.security_audit_log
WHERE created_at >= now() - interval '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), event_type, severity
ORDER BY hour_bucket DESC, event_count DESC;

-- Grant appropriate permissions
GRANT SELECT ON public.security_monitoring_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_rls_violation TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_security_operation TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_enhanced_rate_limit TO authenticated;