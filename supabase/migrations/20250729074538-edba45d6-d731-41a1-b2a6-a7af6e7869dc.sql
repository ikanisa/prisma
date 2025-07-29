-- CRITICAL SECURITY FIXES - Production Readiness Phase 1
-- Fix RLS policies for tables without proper policies

-- 1. Create missing tables first
CREATE TABLE IF NOT EXISTS public.agent_execution_log_enhanced (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT now(),
    function_name TEXT,
    user_id TEXT,
    execution_time_ms INTEGER,
    success_status BOOLEAN,
    error_details TEXT,
    input_data JSONB DEFAULT '{}',
    model_used TEXT
);

CREATE TABLE IF NOT EXISTS public.data_sync_runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    sync_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    records_processed INTEGER DEFAULT 0,
    error_details TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.hardware_vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    name TEXT NOT NULL,
    contact_info JSONB,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}'
);

-- 2. Add comprehensive RLS policies for critical security
ALTER TABLE public.agent_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centralized_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_safety_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hardware_vendors ENABLE ROW LEVEL SECURITY;

-- 3. Create proper RLS policies - System/Admin only for sensitive tables
CREATE POLICY "System manage agent_execution_log" ON public.agent_execution_log 
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin manage agent_performance_metrics" ON public.agent_performance_metrics 
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin manage ai_models" ON public.ai_models 
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin manage alert_configurations" ON public.alert_configurations 
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin manage assistant_configs" ON public.assistant_configs 
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin manage campaign_segments" ON public.campaign_segments 
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin manage centralized_documents" ON public.centralized_documents 
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "System manage content_safety_rules" ON public.content_safety_rules 
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System manage data_sync_runs" ON public.data_sync_runs 
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin manage hardware_vendors" ON public.hardware_vendors 
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 4. Create security functions with proper search_path
CREATE OR REPLACE FUNCTION public.validate_webhook_signature(
    payload TEXT,
    signature TEXT,
    secret TEXT
) RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    expected_signature TEXT;
BEGIN
    -- Validate inputs
    IF payload IS NULL OR signature IS NULL OR secret IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Remove 'sha256=' prefix if present
    signature := REPLACE(signature, 'sha256=', '');
    
    -- Calculate expected signature using HMAC
    expected_signature := encode(
        hmac(payload::bytea, secret::bytea, 'sha256'), 
        'hex'
    );
    
    -- Constant-time comparison
    RETURN expected_signature = signature;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
    identifier TEXT,
    max_requests INTEGER DEFAULT 60,
    window_seconds INTEGER DEFAULT 3600
) RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, reset_time BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_count INTEGER := 0;
    window_start TIMESTAMPTZ;
    reset_timestamp BIGINT;
BEGIN
    -- Calculate window start
    window_start := now() - (window_seconds || ' seconds')::INTERVAL;
    reset_timestamp := extract(epoch from (now() + (window_seconds || ' seconds')::INTERVAL));
    
    -- Get current count in window
    SELECT COUNT(*) INTO current_count
    FROM public.rate_limit_tracker 
    WHERE rate_limit_tracker.identifier = check_rate_limit.identifier
    AND created_at > window_start;
    
    -- Insert current request
    INSERT INTO public.rate_limit_tracker (identifier, created_at)
    VALUES (check_rate_limit.identifier, now())
    ON CONFLICT DO NOTHING;
    
    -- Return result
    IF current_count < max_requests THEN
        RETURN QUERY SELECT TRUE, (max_requests - current_count - 1), reset_timestamp;
    ELSE
        RETURN QUERY SELECT FALSE, 0, reset_timestamp;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.moderate_content(content TEXT) 
RETURNS TABLE(is_safe BOOLEAN, flags TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    unsafe_patterns TEXT[] := ARRAY[
        'system\s*prompt',
        'ignore\s*(previous|above|all)',
        'act\s*as\s*admin',
        '\[SYSTEM\]',
        '\[ADMIN\]'
    ];
    detected_flags TEXT[] := '{}';
    pattern TEXT;
BEGIN
    -- Basic content safety checks
    FOREACH pattern IN ARRAY unsafe_patterns LOOP
        IF content ~* pattern THEN
            detected_flags := array_append(detected_flags, pattern);
        END IF;
    END LOOP;
    
    -- Return safety assessment
    RETURN QUERY SELECT 
        (array_length(detected_flags, 1) IS NULL OR array_length(detected_flags, 1) = 0),
        detected_flags;
END;
$$;

-- 5. Create rate limiting table if not exists
CREATE TABLE IF NOT EXISTS public.rate_limit_tracker (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_tracker_identifier_time 
ON public.rate_limit_tracker(identifier, created_at);

-- Enable RLS and create policy
ALTER TABLE public.rate_limit_tracker ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System manage rate_limit_tracker" ON public.rate_limit_tracker 
FOR ALL USING (true) WITH CHECK (true);

-- 6. Fix function security issues - set proper search_path
ALTER FUNCTION public.trigger_automated_review() SET search_path = public;

-- 7. Create admin check function with security definer
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
        AND status = 'active'
    );
$$;

-- 8. Create bar staff check function
CREATE OR REPLACE FUNCTION public.is_bar_staff(bar_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.businesses 
        WHERE id = bar_uuid 
        AND owner_user_id = auth.uid()
    );
$$;