-- Create membership for the current user in the demo organization
INSERT INTO public.memberships (user_id, org_id, role)
SELECT 
  au.id as user_id,
  org.id as org_id,
  'MANAGER' as role
FROM public.organizations org
CROSS JOIN auth.users au
WHERE org.slug = 'demo'
AND au.email = 'ahorucom@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.memberships m 
  WHERE m.user_id = au.id 
  AND m.org_id = org.id
);

-- Also ensure the user exists in the users table
INSERT INTO public.users (id, email, name, is_system_admin)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email) as name,
  false
FROM auth.users au
WHERE au.email = 'ahorucom@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = COALESCE(EXCLUDED.name, users.name);