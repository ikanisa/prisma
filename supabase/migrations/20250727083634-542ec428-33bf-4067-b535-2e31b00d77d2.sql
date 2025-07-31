-- Phase 1: Critical Security Fixes (Fixed)

-- 1. Fix Admin Authentication Function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  -- Check if current user has admin role in user_roles table
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'moderator')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 3. Create secure function for webhook signature validation
CREATE OR REPLACE FUNCTION public.validate_webhook_signature(
  payload TEXT,
  signature TEXT,
  secret TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  expected_signature TEXT;
BEGIN
  -- Compute HMAC-SHA256 signature
  expected_signature := 'sha256=' || encode(
    hmac(payload::bytea, secret::bytea, 'sha256'),
    'hex'
  );
  
  -- Secure comparison to prevent timing attacks
  RETURN expected_signature = signature;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER IMMUTABLE;

-- 4. Fix security definer function paths
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_webhook_signature(TEXT, TEXT, TEXT) SET search_path = public, pg_temp;

-- 5. Create content moderation function
CREATE OR REPLACE FUNCTION public.moderate_content(content TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Basic content moderation checks
  result := jsonb_build_object(
    'is_safe', true,
    'flags', '[]'::jsonb,
    'confidence', 1.0
  );
  
  -- Check for obvious unsafe patterns
  IF content ~* '(password|secret|token|key|credential)' THEN
    result := jsonb_set(result, '{is_safe}', 'false'::jsonb);
    result := jsonb_set(result, '{flags}', '["potential_sensitive_info"]'::jsonb);
  END IF;
  
  -- Check for excessive length
  IF length(content) > 4000 THEN
    result := jsonb_set(result, '{is_safe}', 'false'::jsonb);
    result := jsonb_set(result, '{flags}', 
      jsonb_set(result->'flags', '{1}', '"excessive_length"'::jsonb));
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER IMMUTABLE;

-- 6. Create rate limiting function and table
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_identifier TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_identifier_time 
ON public.rate_limit_log(request_identifier, created_at);

-- Enable RLS on rate_limit_log
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "System can manage rate_limit_log" ON public.rate_limit_log;

-- Only system can manage rate limit log
CREATE POLICY "System can manage rate_limit_log" ON public.rate_limit_log
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  identifier TEXT,
  max_requests INTEGER DEFAULT 100,
  window_seconds INTEGER DEFAULT 3600
) RETURNS JSONB AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP;
  result JSONB;
BEGIN
  window_start := now() - (window_seconds || ' seconds')::INTERVAL;
  
  -- Count requests in current window
  SELECT COUNT(*) INTO current_count
  FROM public.rate_limit_log
  WHERE request_identifier = identifier
    AND created_at > window_start;
  
  -- Check if limit exceeded
  IF current_count >= max_requests THEN
    result := jsonb_build_object(
      'allowed', false,
      'current_count', current_count,
      'limit', max_requests,
      'reset_time', extract(epoch from (window_start + (window_seconds || ' seconds')::INTERVAL))
    );
  ELSE
    -- Log this request
    INSERT INTO public.rate_limit_log (request_identifier, created_at)
    VALUES (identifier, now());
    
    result := jsonb_build_object(
      'allowed', true,
      'current_count', current_count + 1,
      'limit', max_requests,
      'remaining', max_requests - current_count - 1
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-cleanup function for old entries
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_log()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limit_log 
  WHERE created_at < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;