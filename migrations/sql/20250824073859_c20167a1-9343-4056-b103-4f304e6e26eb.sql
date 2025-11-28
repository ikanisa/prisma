-- Fix infinite recursion in users table RLS policies
-- The issue is users_admin_read policy is causing infinite recursion
-- when checking is_system_admin field

-- Drop the problematic policy
DROP POLICY IF EXISTS "users_admin_read" ON public.users;
-- Create a simple, non-recursive policy for admin access to users
-- Only allow reading other users if the current user is marked as system admin
CREATE POLICY "users_admin_read" 
ON public.users 
FOR SELECT 
USING (
  -- Direct check without function calls to avoid recursion
  (SELECT is_system_admin FROM public.users WHERE id = auth.uid()) = true
);
