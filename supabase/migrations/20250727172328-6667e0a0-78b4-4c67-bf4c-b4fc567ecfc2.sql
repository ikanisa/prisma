-- Security Enhancement Migration - Fixed Version
-- Fix critical database security issues identified by linter

-- 1. Create whatsapp_logs table for the new router function
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT NOT NULL,
    contact_name TEXT,
    message_id TEXT,
    message_content TEXT,
    message_type TEXT DEFAULT 'text',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    received_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on whatsapp_logs
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for whatsapp_logs
CREATE POLICY "Admin can manage whatsapp logs" 
ON public.whatsapp_logs 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "System can manage whatsapp logs" 
ON public.whatsapp_logs 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_phone_number ON public.whatsapp_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_processed ON public.whatsapp_logs(processed);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_timestamp ON public.whatsapp_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_message_id ON public.whatsapp_logs(message_id);

-- 2. Create rate limiting table for enhanced security
CREATE TABLE IF NOT EXISTS public.rate_limit_tracker (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on rate_limit_tracker
ALTER TABLE public.rate_limit_tracker ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for rate_limit_tracker
CREATE POLICY "System can manage rate limits" 
ON public.rate_limit_tracker 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create indexes for rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier_endpoint ON public.rate_limit_tracker(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window_start ON public.rate_limit_tracker(window_start);

-- 3. Create security audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    source_ip TEXT,
    user_agent TEXT,
    endpoint TEXT,
    user_id UUID,
    phone_number TEXT,
    details JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on security_audit_log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for security_audit_log
CREATE POLICY "Admin can view security audit log" 
ON public.security_audit_log 
FOR SELECT 
USING (is_admin());

CREATE POLICY "System can manage security audit log" 
ON public.security_audit_log 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create indexes for security audit log
CREATE INDEX IF NOT EXISTS idx_security_audit_event_type ON public.security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_severity ON public.security_audit_log(severity);
CREATE INDEX IF NOT EXISTS idx_security_audit_timestamp ON public.security_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_audit_source_ip ON public.security_audit_log(source_ip);

-- 4. Create secure cleanup function with proper search_path
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Clean up rate limit entries older than 24 hours
    DELETE FROM public.rate_limit_tracker 
    WHERE window_start < now() - INTERVAL '24 hours';
    
    -- Clean up audit logs older than 30 days
    DELETE FROM public.security_audit_log 
    WHERE timestamp < now() - INTERVAL '30 days';
    
    -- Clean up old whatsapp logs (keep for 90 days)
    DELETE FROM public.whatsapp_logs 
    WHERE created_at < now() - INTERVAL '90 days';
END;
$$;