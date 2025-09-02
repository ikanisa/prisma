-- Fix RLS policies for core authentication tables

-- First, create RLS policies for users table
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR ALL 
USING (auth.uid() = id);

-- Create RLS policies for organizations table
CREATE POLICY "Members can view their organizations" 
ON public.organizations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE memberships.org_id = organizations.id 
    AND memberships.user_id = auth.uid()
  )
);

-- Create RLS policies for memberships table (this is the critical one)
CREATE POLICY "Users can view their own memberships" 
ON public.memberships 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own memberships" 
ON public.memberships 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Create a demo organization and membership for the user who just signed in
DO $$
DECLARE
    demo_org_id uuid;
    current_user_id uuid := auth.uid();
BEGIN
    -- Get or create demo organization
    SELECT id INTO demo_org_id 
    FROM public.organizations 
    WHERE slug = 'demo';
    
    -- If no demo org exists, create one
    IF demo_org_id IS NULL THEN
        INSERT INTO public.organizations (id, slug, name, plan) 
        VALUES (gen_random_uuid(), 'demo', 'Demo Organization', 'dev')
        RETURNING id INTO demo_org_id;
    END IF;
    
    -- Create membership for current user if they don't have one
    IF current_user_id IS NOT NULL THEN
        INSERT INTO public.memberships (user_id, org_id, role) 
        VALUES (current_user_id, demo_org_id, 'MANAGER')
        ON CONFLICT (user_id, org_id) DO NOTHING;
    END IF;
END $$;