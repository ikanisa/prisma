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
