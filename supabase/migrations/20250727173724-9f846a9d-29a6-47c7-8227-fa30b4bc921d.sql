-- CRITICAL SECURITY FIXES - Phase 1 (Fixed)

-- 1. Drop and recreate functions with proper security
DROP FUNCTION IF EXISTS public.moderate_content(text);
DROP FUNCTION IF EXISTS public.get_auth();
DROP FUNCTION IF EXISTS public.check_rate_limit(text, integer, integer);
DROP FUNCTION IF EXISTS cleanup_old_logs();

-- Recreate with proper search_path protection
CREATE OR REPLACE FUNCTION public.get_auth()
RETURNS json AS $$
DECLARE
    auth_data json;
BEGIN
    -- Get current user info from auth.users via JWT
    SELECT json_build_object(
        'user_id', auth.uid(),
        'email', auth.email(),
        'role', COALESCE(auth.jwt()->>'role', 'user')
    ) INTO auth_data;
    
    RETURN auth_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.moderate_content(content_text text)
RETURNS json AS $$
DECLARE
    result json;
    flagged boolean := false;
    categories text[] := '{}';
BEGIN
    -- Basic content moderation logic
    IF content_text ~* '\b(spam|scam|fraud|illegal)\b' THEN
        flagged := true;
        categories := array_append(categories, 'harmful_content');
    END IF;
    
    IF char_length(content_text) > 5000 THEN
        flagged := true;
        categories := array_append(categories, 'excessive_length');
    END IF;
    
    result := json_build_object(
        'flagged', flagged,
        'categories', categories,
        'confidence', 0.8
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_rate_limit(identifier text, max_requests integer, window_minutes integer)
RETURNS boolean AS $$
DECLARE
    current_count integer;
    window_start timestamp;
BEGIN
    window_start := now() - (window_minutes || ' minutes')::interval;
    
    SELECT count(*) INTO current_count
    FROM rate_limit_tracker
    WHERE tracking_key = identifier 
    AND created_at >= window_start;
    
    -- Insert current request
    INSERT INTO rate_limit_tracker (tracking_key, request_count)
    VALUES (identifier, 1)
    ON CONFLICT (tracking_key) 
    DO UPDATE SET 
        request_count = rate_limit_tracker.request_count + 1,
        updated_at = now();
    
    RETURN current_count < max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    -- Clean up old rate limit logs (older than 7 days)
    DELETE FROM rate_limit_tracker 
    WHERE created_at < now() - interval '7 days';
    
    -- Clean up old security audit logs (older than 30 days)
    DELETE FROM security_audit_log 
    WHERE created_at < now() - interval '30 days';
    
    -- Clean up old WhatsApp logs (older than 14 days)
    DELETE FROM whatsapp_logs 
    WHERE created_at < now() - interval '14 days';
    
    -- Log cleanup completion
    INSERT INTO security_audit_log (event_type, severity, source_ip, details)
    VALUES ('system_cleanup', 'low', '127.0.0.1', '{"action": "log_cleanup", "completed_at": "' || now() || '"}');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Enhanced security validation functions
CREATE OR REPLACE FUNCTION public.validate_phone_number(phone text)
RETURNS boolean AS $$
BEGIN
    -- Rwanda phone number validation (+250XXXXXXXXX)
    RETURN phone ~ '^\+250[0-9]{9}$' OR phone ~ '^250[0-9]{9}$' OR phone ~ '^0[0-9]{9}$';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.sanitize_user_input(input_text text)
RETURNS text AS $$
BEGIN
    -- Remove potentially dangerous characters and limit length
    RETURN substring(
        regexp_replace(
            regexp_replace(input_text, '[<>"]', '', 'g'),
            '\s+', ' ', 'g'
        ), 1, 1000
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Add security event logging trigger
CREATE OR REPLACE FUNCTION log_security_event()
RETURNS trigger AS $$
BEGIN
    -- Log security-sensitive table modifications
    INSERT INTO security_audit_log (
        event_type, 
        severity, 
        source_ip, 
        user_id,
        details
    ) VALUES (
        TG_OP || '_' || TG_TABLE_NAME,
        'medium',
        coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', '127.0.0.1'),
        auth.uid()::text,
        json_build_object(
            'table', TG_TABLE_NAME,
            'operation', TG_OP,
            'timestamp', now()
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply security logging to sensitive tables
DROP TRIGGER IF EXISTS security_log_trigger ON contacts;
CREATE TRIGGER security_log_trigger
    AFTER INSERT OR UPDATE OR DELETE ON contacts
    FOR EACH ROW EXECUTE FUNCTION log_security_event();

DROP TRIGGER IF EXISTS security_log_trigger ON businesses;
CREATE TRIGGER security_log_trigger
    AFTER INSERT OR UPDATE OR DELETE ON businesses  
    FOR EACH ROW EXECUTE FUNCTION log_security_event();

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.validate_phone_number(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sanitize_user_input(text) TO authenticated, anon;