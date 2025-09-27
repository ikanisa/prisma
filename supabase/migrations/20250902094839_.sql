-- Ensure demo user has proper membership
-- This will create a membership for the currently signed-in user
INSERT INTO public.memberships (user_id, org_id, role) 
SELECT 
  'ba6d443b-3f19-458f-a091-69c3ac1564f3'::uuid as user_id, 
  o.id as org_id,
  'MANAGER'::role_level as role
FROM public.organizations o 
WHERE o.slug = 'demo'
ON CONFLICT (user_id, org_id) DO NOTHING;;
