-- Create RPC function to create admin user bypassing RLS
CREATE OR REPLACE FUNCTION public.create_admin_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert admin role for the user, ignore if already exists
  INSERT INTO user_roles (user_id, role)
  VALUES (user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;