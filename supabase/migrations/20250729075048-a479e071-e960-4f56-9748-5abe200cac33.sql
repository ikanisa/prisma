-- Drop existing functions that conflict and recreate with proper signatures
DROP FUNCTION IF EXISTS public.check_rate_limit(text,integer,integer);

-- Create the rate limiting function with proper return type
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