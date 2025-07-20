-- Allow system to create admin users during setup
-- Add a policy that allows inserting admin roles when no admin exists yet
CREATE POLICY "Allow first admin creation" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  role = 'admin' AND 
  NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'
  )
);