-- Security Fix 1: Add security monitoring table
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id uuid,
  ip_address inet,
  user_agent text,
  endpoint text,
  details jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Admin can view security events" ON public.security_events
FOR SELECT USING (is_admin());

-- System can insert security events
CREATE POLICY "System can log security events" ON public.security_events
FOR INSERT WITH CHECK (true);

-- Security Fix 2: Add content safety monitoring
CREATE TABLE IF NOT EXISTS public.message_safety_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  message_content text NOT NULL,
  safety_score numeric,
  flagged_content text[],
  action_taken text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on message safety log
ALTER TABLE public.message_safety_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view safety logs
CREATE POLICY "Admin can view safety logs" ON public.message_safety_log
FOR SELECT USING (is_admin());

-- System can insert safety logs
CREATE POLICY "System can log safety events" ON public.message_safety_log
FOR INSERT WITH CHECK (true);

-- Security Fix 3: Update is_admin function with proper security
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get user role from profiles table or return false if no profile exists
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role = 'admin', false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;