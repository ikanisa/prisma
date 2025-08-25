-- Create Aurora Advisors organization
INSERT INTO public.organizations (name, slug, brand_primary, brand_secondary)
VALUES ('Aurora Advisors', 'aurora', '#6366f1', '#8b5cf6')
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
WHERE o.slug = 'aurora'
ON CONFLICT DO NOTHING;