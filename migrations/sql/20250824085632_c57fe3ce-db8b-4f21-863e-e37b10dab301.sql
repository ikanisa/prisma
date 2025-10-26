-- Create Prisma Glow organization
INSERT INTO public.organizations (name, slug, brand_primary, brand_secondary)
VALUES ('Prisma Glow', 'prisma-glow', '#2563eb', '#7c3aed')
ON CONFLICT (slug) DO NOTHING;
-- Get the organization ID for Prisma Glow
DO $$
DECLARE
    org_uuid uuid;
    sophia_uuid uuid;
    mark_uuid uuid;
    eli_uuid uuid;
    zero_instance uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- Get organization ID
    SELECT id INTO org_uuid FROM public.organizations WHERE slug = 'prisma-glow';

    IF org_uuid IS NULL THEN
        RAISE NOTICE 'Prisma Glow organization not found; skipping demo user seed.';
        RETURN;
    END IF;

    -- Ensure Sophia (system admin)
    SELECT id INTO sophia_uuid FROM auth.users WHERE email = 'sophia@prismaglow.test';
    IF sophia_uuid IS NULL THEN
        sophia_uuid := gen_random_uuid();
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at
        ) VALUES (
            zero_instance, sophia_uuid, 'authenticated', 'authenticated', 'sophia@prismaglow.test',
            crypt('securepass123', gen_salt('bf')),
            now(),
            jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
            jsonb_build_object('name', 'Sophia Systems', 'email', 'sophia@prismaglow.test', 'email_verified', true),
            now(), now()
        );
    END IF;

    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
    VALUES (
        sophia_uuid::text,
        sophia_uuid,
        jsonb_build_object('sub', sophia_uuid::text, 'email', 'sophia@prismaglow.test', 'email_verified', true),
        'email',
        now(),
        now()
    )
    ON CONFLICT (provider_id, provider) DO UPDATE
      SET identity_data = EXCLUDED.identity_data,
          updated_at = EXCLUDED.updated_at;

    INSERT INTO public.users (id, email, name)
    VALUES (sophia_uuid, 'sophia@prismaglow.test', 'Sophia Systems')
    ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email,
          name = EXCLUDED.name;

    -- Ensure Mark (manager)
    SELECT id INTO mark_uuid FROM auth.users WHERE email = 'mark@prismaglow.test';
    IF mark_uuid IS NULL THEN
        mark_uuid := gen_random_uuid();
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at
        ) VALUES (
            zero_instance, mark_uuid, 'authenticated', 'authenticated', 'mark@prismaglow.test',
            crypt('securepass123', gen_salt('bf')),
            now(),
            jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
            jsonb_build_object('name', 'Mark Manager', 'email', 'mark@prismaglow.test', 'email_verified', true),
            now(), now()
        );
    END IF;

    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
    VALUES (
        mark_uuid::text,
        mark_uuid,
        jsonb_build_object('sub', mark_uuid::text, 'email', 'mark@prismaglow.test', 'email_verified', true),
        'email',
        now(),
        now()
    )
    ON CONFLICT (provider_id, provider) DO UPDATE
      SET identity_data = EXCLUDED.identity_data,
          updated_at = EXCLUDED.updated_at;

    INSERT INTO public.users (id, email, name)
    VALUES (mark_uuid, 'mark@prismaglow.test', 'Mark Manager')
    ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email,
          name = EXCLUDED.name;

    -- Ensure Eli (employee)
    SELECT id INTO eli_uuid FROM auth.users WHERE email = 'eli@prismaglow.test';
    IF eli_uuid IS NULL THEN
        eli_uuid := gen_random_uuid();
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at
        ) VALUES (
            zero_instance, eli_uuid, 'authenticated', 'authenticated', 'eli@prismaglow.test',
            crypt('securepass123', gen_salt('bf')),
            now(),
            jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
            jsonb_build_object('name', 'Eli Employee', 'email', 'eli@prismaglow.test', 'email_verified', true),
            now(), now()
        );
    END IF;

    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
    VALUES (
        eli_uuid::text,
        eli_uuid,
        jsonb_build_object('sub', eli_uuid::text, 'email', 'eli@prismaglow.test', 'email_verified', true),
        'email',
        now(),
        now()
    )
    ON CONFLICT (provider_id, provider) DO UPDATE
      SET identity_data = EXCLUDED.identity_data,
          updated_at = EXCLUDED.updated_at;

    INSERT INTO public.users (id, email, name)
    VALUES (eli_uuid, 'eli@prismaglow.test', 'Eli Employee')
    ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email,
          name = EXCLUDED.name;

    -- Mark Sophia as system admin in app profile table
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
