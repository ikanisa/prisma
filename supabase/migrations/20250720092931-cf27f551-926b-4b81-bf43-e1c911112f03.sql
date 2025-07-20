-- CRITICAL FIX 1: Implement proper admin authentication system
-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'driver', 'farmer', 'business_owner');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    assigned_by uuid REFERENCES auth.users(id),
    assigned_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking (prevents RLS recursion)
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

-- Fix the is_admin function to actually check roles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role);
$$;

-- Create function to check if user is business staff
CREATE OR REPLACE FUNCTION public.is_bar_staff(bar_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM businesses 
    WHERE id = bar_id 
    AND owner_user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin'::app_role);
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- CRITICAL FIX 2: Remove overpermissive RLS policies and replace with proper ones
DROP POLICY IF EXISTS "Admin full access" ON agents;
CREATE POLICY "Admin access agents" ON agents 
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin full access" ON agent_personas;
CREATE POLICY "Admin access agent_personas" ON agent_personas 
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Fix other overpermissive policies found in the audit
-- Replace any remaining USING (true) policies with proper conditions

-- Add search_path to existing functions to fix linter warnings
CREATE OR REPLACE FUNCTION public.fn_admin_force_match(p_trip_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to force match
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;
  
  -- Update driver trip status to matched
  UPDATE driver_trips_spatial 
  SET status = 'matched', updated_at = now()
  WHERE id = p_trip_id;
  
  -- Update passenger intent status to matched 
  UPDATE passenger_intents_spatial 
  SET status = 'matched', updated_at = now()
  WHERE id = p_trip_id;
END;
$$;

-- Insert initial admin user (replace with actual admin user ID after first signup)
-- This will need to be run manually after admin user signs up
-- INSERT INTO public.user_roles (user_id, role) 
-- VALUES ('REPLACE_WITH_ADMIN_USER_ID', 'admin'::app_role);