-- Drop the old function first to fix return type conflict
DROP FUNCTION IF EXISTS public.create_admin_user(uuid);

-- COMPREHENSIVE ADMIN SETUP FIX
-- This migration fixes all issues with the admin creation workflow

-- 1. First, ensure the app_role enum exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'driver', 'farmer', 'pharmacist', 'moderator');
    END IF;
END $$;

-- 2. Create or fix the user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    assigned_by uuid REFERENCES auth.users(id),
    assigned_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create security definer function for role checking (prevents RLS recursion)
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

-- 5. Create is_admin helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role);
$$;

-- 6. Create the create_admin_user function with proper return type
CREATE OR REPLACE FUNCTION public.create_admin_user(user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_exists boolean;
    result json;
BEGIN
    -- Check if any admin already exists
    SELECT EXISTS(SELECT 1 FROM user_roles WHERE role = 'admin') INTO admin_exists;
    
    -- If this is the first admin OR if called by existing admin, allow creation
    IF NOT admin_exists OR public.has_role(auth.uid(), 'admin'::app_role) THEN
        -- Insert admin role for the user, ignore if already exists
        INSERT INTO user_roles (user_id, role, assigned_by)
        VALUES (user_id, 'admin', COALESCE(auth.uid(), user_id))
        ON CONFLICT (user_id, role) DO NOTHING;
        
        result := json_build_object(
            'success', true,
            'message', 'Admin role assigned successfully',
            'is_first_admin', NOT admin_exists
        );
    ELSE
        result := json_build_object(
            'success', false,
            'message', 'Only existing admins can create new admin accounts'
        );
    END IF;
    
    RETURN result;
END;
$$;

-- 7. Drop existing overpermissive policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow first admin creation" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow first admin creation when no admin exists" ON public.user_roles;

-- 8. Create proper RLS policies for user_roles table
CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 9. Special policy for first admin creation (bypasses normal RLS when no admin exists)
CREATE POLICY "Allow first admin creation when no admin exists" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  role = 'admin' AND 
  NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
);

-- 10. Create function to check if any admin exists (for the UI)
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'admin');
$$;

-- 11. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.user_roles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_admin_user(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;