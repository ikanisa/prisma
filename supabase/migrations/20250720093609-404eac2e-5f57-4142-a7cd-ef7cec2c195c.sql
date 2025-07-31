-- SECURITY FIX: Complete the security implementation
-- Fix function search paths for security
ALTER FUNCTION public.fn_admin_force_match(uuid) SET search_path = public;

-- Create a function to check if user is authenticated (for system operations)
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

-- Create security audit log table
CREATE TABLE IF NOT EXISTS public.security_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    user_id uuid REFERENCES auth.users(id),
    source_ip text,
    user_agent text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Admin read security events" ON public.security_events 
FOR SELECT USING (public.is_admin());

-- System can insert security events
CREATE POLICY "System write security events" ON public.security_events 
FOR INSERT WITH CHECK (true);

-- Add search_path to more functions that need it (fixing linter warnings)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;