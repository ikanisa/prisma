-- CRITICAL SECURITY FIXES: Phase 1 - Database Security (Fixed)

-- 1. Enable RLS on businesses_backup table and create policies
ALTER TABLE public.businesses_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage businesses_backup" 
ON public.businesses_backup 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

-- 2. Drop and recreate GDPR functions with proper signatures
DROP FUNCTION IF EXISTS public.gdpr_delete_user_data(uuid);
DROP FUNCTION IF EXISTS public.gdpr_export_user_data(uuid);

-- 3. Create security events table for audit logging
CREATE TABLE IF NOT EXISTS public.security_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    user_id uuid,
    ip_address inet,
    user_agent text,
    details jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security events"
ON public.security_events
FOR SELECT
USING (is_admin());

CREATE POLICY "System can insert security events"
ON public.security_events
FOR INSERT
WITH CHECK (true);

-- 4. Create rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier text NOT NULL,
    endpoint text NOT NULL,
    request_count integer DEFAULT 1,
    window_start timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(identifier, endpoint, window_start)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage rate_limits"
ON public.rate_limits
FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    _identifier text,
    _endpoint text,
    _max_requests integer DEFAULT 100,
    _window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_count integer := 0;
    window_start_time timestamp with time zone;
BEGIN
    window_start_time := date_trunc('hour', now()) + 
                        (EXTRACT(minute FROM now())::integer / _window_minutes) * 
                        interval '1 minute' * _window_minutes;
    
    -- Get current count for this window
    SELECT COALESCE(request_count, 0) INTO current_count
    FROM public.rate_limits
    WHERE identifier = _identifier
      AND endpoint = _endpoint
      AND window_start = window_start_time;
    
    -- Check if rate limit exceeded
    IF current_count >= _max_requests THEN
        -- Log rate limit violation
        INSERT INTO public.security_events (event_type, severity, details)
        VALUES ('rate_limit_exceeded', 'medium', 
                jsonb_build_object('identifier', _identifier, 'endpoint', _endpoint, 
                                 'count', current_count, 'limit', _max_requests));
        RETURN false;
    END IF;
    
    -- Increment counter
    INSERT INTO public.rate_limits (identifier, endpoint, window_start, request_count)
    VALUES (_identifier, _endpoint, window_start_time, 1)
    ON CONFLICT (identifier, endpoint, window_start)
    DO UPDATE SET request_count = rate_limits.request_count + 1;
    
    RETURN true;
END;
$$;

-- 6. Create webhook signature validation function
CREATE OR REPLACE FUNCTION public.validate_webhook_signature(
    payload text,
    signature text,
    secret text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    expected_signature text;
BEGIN
    -- Remove 'sha256=' prefix if present
    IF signature LIKE 'sha256=%' THEN
        signature := substring(signature from 8);
    END IF;
    
    -- Calculate HMAC-SHA256
    expected_signature := encode(
        hmac(payload::bytea, secret::bytea, 'sha256'),
        'hex'
    );
    
    -- Compare signatures
    RETURN signature = expected_signature;
END;
$$;

-- 7. Create secure admin role management functions
CREATE OR REPLACE FUNCTION public.create_admin_user(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Only existing admins can create new admins
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Access denied: Only admins can create admin users';
    END IF;
    
    -- Get user ID from email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found with email: %', user_email;
    END IF;
    
    -- Insert admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Log the admin creation
    INSERT INTO public.security_events (event_type, severity, user_id, details)
    VALUES ('admin_created', 'critical', auth.uid(), 
            jsonb_build_object('target_user', target_user_id, 'target_email', user_email));
END;
$$;

-- 8. Recreate GDPR compliance functions
CREATE FUNCTION public.gdpr_delete_user_data(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only admins or the user themselves can delete user data
    IF NOT (is_admin() OR auth.uid() = target_user_id) THEN
        RAISE EXCEPTION 'Access denied: Cannot delete user data';
    END IF;
    
    -- Log the deletion request
    INSERT INTO public.security_events (event_type, severity, user_id, details)
    VALUES ('gdpr_deletion', 'high', auth.uid(), 
            jsonb_build_object('target_user', target_user_id));
    
    -- Delete user data from various tables (add more as needed)
    DELETE FROM public.agent_conversations WHERE user_id = target_user_id;
    DELETE FROM public.agent_memory WHERE user_id = target_user_id::text;
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
END;
$$;

CREATE FUNCTION public.gdpr_export_user_data(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_data jsonb := '{}';
BEGIN
    -- Only admins or the user themselves can export user data
    IF NOT (is_admin() OR auth.uid() = target_user_id) THEN
        RAISE EXCEPTION 'Access denied: Cannot export user data';
    END IF;
    
    -- Log the export request
    INSERT INTO public.security_events (event_type, severity, user_id, details)
    VALUES ('gdpr_export', 'medium', auth.uid(), 
            jsonb_build_object('target_user', target_user_id));
    
    -- Collect user data from various tables
    user_data := jsonb_build_object(
        'user_id', target_user_id,
        'conversations', (
            SELECT COALESCE(jsonb_agg(to_jsonb(c)), '[]')
            FROM public.agent_conversations c
            WHERE c.user_id = target_user_id
        ),
        'memory', (
            SELECT COALESCE(jsonb_agg(to_jsonb(m)), '[]')
            FROM public.agent_memory m
            WHERE m.user_id = target_user_id::text
        ),
        'roles', (
            SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]')
            FROM public.user_roles r
            WHERE r.user_id = target_user_id
        ),
        'exported_at', now()
    );
    
    RETURN user_data;
END;
$$;