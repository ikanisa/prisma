-- Create Prisma Glow organization
INSERT INTO public.organizations (name, slug, brand_primary, brand_secondary)
VALUES ('Prisma Glow', 'prisma-glow', '#2563eb', '#7c3aed')
ON CONFLICT (slug) DO NOTHING;
-- Create sample clients
INSERT INTO public.clients (org_id, name, contact_name, email, phone, country, industry, fiscal_year_end) 
SELECT 
    o.id,
    c.name,
    c.contact_name,
    c.email,
    c.phone,
    c.country,
    c.industry,
    c.fiscal_year_end
FROM public.organizations o,
(VALUES 
    ('TechCorp Inc.', 'John Smith', 'john@techcorp.com', '+1234567890', 'United States', 'Technology', 'December 31'),
    ('Global Manufacturing Ltd.', 'Sarah Johnson', 'sarah@globalmanuf.com', '+1987654321', 'Canada', 'Manufacturing', 'March 31')
) AS c(name, contact_name, email, phone, country, industry, fiscal_year_end)
WHERE o.slug = 'prisma-glow'
ON CONFLICT DO NOTHING;

-- Seed engagements mirroring demo data
INSERT INTO public.engagements (
    org_id,
    client_id,
    title,
    status,
    start_date,
    end_date,
    is_audit_client,
    requires_eqr,
    non_audit_services,
    independence_checked,
    independence_conclusion,
    independence_conclusion_note
)
SELECT
    o.id,
    c.id,
    'FY25 Audit',
    'IN_PROGRESS',
    '2025-01-01',
    '2025-03-31',
    true,
    true,
    jsonb_build_array(
      jsonb_build_object('service', 'Tax compliance', 'prohibited', false, 'description', 'Routine filings prepared with safeguards')
    ),
    true,
    'OK',
    NULL
FROM public.organizations o
JOIN public.clients c ON c.org_id = o.id AND c.name = 'TechCorp Inc.'
WHERE o.slug = 'prisma-glow'
ON CONFLICT DO NOTHING;

INSERT INTO public.engagements (
    org_id,
    client_id,
    title,
    status,
    start_date,
    end_date,
    is_audit_client,
    requires_eqr,
    non_audit_services,
    independence_checked,
    independence_conclusion,
    independence_conclusion_note
)
SELECT
    o.id,
    c.id,
    'FY25 Advisory',
    'PLANNING',
    '2025-04-01',
    '2025-06-30',
    true,
    false,
    jsonb_build_array(
      jsonb_build_object('service', 'Management or decision-making', 'prohibited', true, 'description', 'Management responsibilities prohibited')
    ),
    false,
    'PROHIBITED',
    'Requires partner override before starting work.'
FROM public.organizations o
JOIN public.clients c ON c.org_id = o.id AND c.name = 'Global Manufacturing Ltd.'
WHERE o.slug = 'prisma-glow'
ON CONFLICT DO NOTHING;
