-- Create Aurora Advisors organization
INSERT INTO public.organizations (name, slug, brand_primary, brand_secondary)
VALUES ('Aurora Advisors', 'aurora', '#6366f1', '#8b5cf6')
ON CONFLICT (slug) DO NOTHING;

-- Get the organization ID for Aurora Advisors
DO $$
DECLARE
    org_uuid uuid;
    sophia_uuid uuid;
    mark_uuid uuid;
    eli_uuid uuid;
BEGIN
    -- Get organization ID
    SELECT id INTO org_uuid FROM public.organizations WHERE slug = 'aurora';
    
    -- Create demo users with auth.admin_create_user function
    -- Note: These users will be created with confirmed emails
    
    -- Create Sophia (System Admin)
    SELECT auth.admin_create_user(
        'sophia@aurora.test',
        'lovable123',
        '{"name": "Sophia System"}',
        true -- email_confirm
    ) INTO sophia_uuid;
    
    -- Create Mark (Manager)  
    SELECT auth.admin_create_user(
        'mark@aurora.test',
        'lovable123', 
        '{"name": "Mark Manager"}',
        true -- email_confirm
    ) INTO mark_uuid;
    
    -- Create Eli (Employee)
    SELECT auth.admin_create_user(
        'eli@aurora.test',
        'lovable123',
        '{"name": "Eli Employee"}', 
        true -- email_confirm
    ) INTO eli_uuid;
    
    -- Update Sophia to be system admin
    UPDATE public.users 
    SET is_system_admin = true 
    WHERE id = sophia_uuid;
    
    -- Create memberships
    INSERT INTO public.memberships (org_id, user_id, role) VALUES
    (org_uuid, sophia_uuid, 'SYSTEM_ADMIN'),
    (org_uuid, mark_uuid, 'MANAGER'),
    (org_uuid, eli_uuid, 'EMPLOYEE')
    ON CONFLICT DO NOTHING;
    
    -- Create sample clients
    INSERT INTO public.clients (org_id, name, contact_name, email, phone, country, industry, fiscal_year_end) VALUES
    (org_uuid, 'TechCorp Inc.', 'John Smith', 'john@techcorp.com', '+1234567890', 'United States', 'Technology', 'December 31'),
    (org_uuid, 'Global Manufacturing Ltd.', 'Sarah Johnson', 'sarah@globalmanuf.com', '+1987654321', 'Canada', 'Manufacturing', 'March 31')
    ON CONFLICT DO NOTHING;
    
END $$;