-- ============================================================================
-- Prisma Core Seed Data
-- Version: 1.0.0
-- Date: 2026-01-09
-- 
-- Demo data for development and testing:
-- - 1 demo firm
-- - 1 demo user + membership
-- - 3 demo clients (one per jurisdiction RW/MT/CA, all SMEs)
-- - Sample engagements
-- - Sample playbooks
-- ============================================================================

-- ============================================================================
-- DEMO FIRM
-- ============================================================================

INSERT INTO firms (id, name, slug, jurisdiction_code, settings_json) VALUES
    ('11111111-1111-1111-1111-111111111111', 
     'Demo Accounting Firm', 
     'demo-firm',
     'RW',
     '{"timezone": "Africa/Kigali", "default_currency": "RWF"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEMO USER MEMBERSHIP
-- (Note: The actual user must exist in auth.users - this creates the mapping)
-- In development, use Supabase Dashboard to create a user first
-- ============================================================================

-- This assumes a demo user exists with a specific ID
-- In production, run this after creating the user via Supabase Auth
-- 
-- To create a test user in development:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Create user: demo@prismacore.dev / demopass123
-- 3. Copy the user ID and update below

-- Placeholder membership (will fail if user doesn't exist - that's expected)
DO $$
DECLARE
    demo_user_id UUID;
BEGIN
    -- Try to get an existing user (first user in the system)
    SELECT id INTO demo_user_id FROM auth.users LIMIT 1;
    
    IF demo_user_id IS NOT NULL THEN
        INSERT INTO firm_memberships (user_id, firm_id, role, is_primary)
        VALUES (demo_user_id, '11111111-1111-1111-1111-111111111111', 'ADMIN', true)
        ON CONFLICT (user_id, firm_id) DO NOTHING;
        
        RAISE NOTICE 'Created demo membership for user %', demo_user_id;
    ELSE
        RAISE NOTICE 'No users found. Create a user first, then re-run seed.';
    END IF;
END $$;

-- ============================================================================
-- DEMO CLIENTS (One per jurisdiction, all SMEs - NO financial institutions)
-- ============================================================================

-- Rwanda client (micro SME)
INSERT INTO clients (
    id, firm_id, name, jurisdiction, client_segment, 
    entity_type, industry_code, industry_description,
    is_financial_institution, eligibility_status,
    email, tax_id
) VALUES (
    '22222222-2222-2222-2222-222222222221',
    '11111111-1111-1111-1111-111111111111',
    'Kigali Tech Solutions Ltd',
    'RW',
    'micro',
    'private_company',
    '6201',
    'Information Technology Services',
    FALSE,
    'eligible',
    'contact@kigalitech.rw',
    'RW-123456789'
) ON CONFLICT (id) DO NOTHING;

-- Malta client (small SME)
INSERT INTO clients (
    id, firm_id, name, jurisdiction, client_segment,
    entity_type, industry_code, industry_description,
    is_financial_institution, eligibility_status,
    email, tax_id, vat_number
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Mediterranean Trading Co Ltd',
    'MT',
    'small',
    'private_company',
    '4690',
    'Wholesale Trade',
    FALSE,
    'eligible',
    'info@medtrading.mt',
    'MT12345678',
    'MT12345678'
) ON CONFLICT (id) DO NOTHING;

-- Canada client (medium SME)
INSERT INTO clients (
    id, firm_id, name, jurisdiction, client_segment,
    entity_type, industry_code, industry_description,
    is_financial_institution, eligibility_status,
    email, tax_id
) VALUES (
    '22222222-2222-2222-2222-222222222223',
    '11111111-1111-1111-1111-111111111111',
    'Maple Leaf Industries Inc',
    'CA',
    'medium',
    'private_company',
    '3399',
    'Manufacturing',
    FALSE,
    'eligible',
    'info@mapleleaf.ca',
    'CA-987654321'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEMO PLAYBOOKS (One per jurisdiction/type combination)
-- ============================================================================

-- Rwanda Accounting Playbook
INSERT INTO playbooks (id, jurisdiction, engagement_type, version, name, description, config_json, is_active) VALUES
    ('33333333-3333-3333-3333-333333333301', 'RW', 'accounting', '1.0.0', 
     'Rwanda Accounting Playbook', 
     'Standard accounting engagement for Rwanda with RRA/EBM compliance',
     '{"vat_rate": 0.18, "compliance": ["RRA", "EBM"]}'::jsonb, true)
ON CONFLICT (jurisdiction, engagement_type, version) DO NOTHING;

-- Rwanda Audit Playbook
INSERT INTO playbooks (id, jurisdiction, engagement_type, version, name, description, config_json, is_active) VALUES
    ('33333333-3333-3333-3333-333333333302', 'RW', 'audit', '1.0.0', 
     'Rwanda Audit Playbook', 
     'ISA-based audit engagement for Rwanda',
     '{"framework": "ISA", "regulator": "ICPAR"}'::jsonb, true)
ON CONFLICT (jurisdiction, engagement_type, version) DO NOTHING;

-- Rwanda Tax Playbook
INSERT INTO playbooks (id, jurisdiction, engagement_type, version, name, description, config_json, is_active) VALUES
    ('33333333-3333-3333-3333-333333333303', 'RW', 'tax', '1.0.0', 
     'Rwanda Tax Playbook', 
     'Tax compliance for Rwanda (VAT, PAYE, CIT)',
     '{"vat_rate": 0.18, "cit_rate": 0.30, "authority": "RRA"}'::jsonb, true)
ON CONFLICT (jurisdiction, engagement_type, version) DO NOTHING;

-- Malta Accounting Playbook
INSERT INTO playbooks (id, jurisdiction, engagement_type, version, name, description, config_json, is_active) VALUES
    ('33333333-3333-3333-3333-333333333304', 'MT', 'accounting', '1.0.0', 
     'Malta Accounting Playbook', 
     'GAPSME/IFRS accounting for Malta',
     '{"frameworks": ["GAPSME", "IFRS"], "regulator": "MIA"}'::jsonb, true)
ON CONFLICT (jurisdiction, engagement_type, version) DO NOTHING;

-- Malta Audit Playbook
INSERT INTO playbooks (id, jurisdiction, engagement_type, version, name, description, config_json, is_active) VALUES
    ('33333333-3333-3333-3333-333333333305', 'MT', 'audit', '1.0.0', 
     'Malta Audit Playbook', 
     'MIA/ISA audit engagement for Malta',
     '{"framework": "ISA", "regulator": "MIA"}'::jsonb, true)
ON CONFLICT (jurisdiction, engagement_type, version) DO NOTHING;

-- Malta Tax Playbook
INSERT INTO playbooks (id, jurisdiction, engagement_type, version, name, description, config_json, is_active) VALUES
    ('33333333-3333-3333-3333-333333333306', 'MT', 'tax', '1.0.0', 
     'Malta Tax Playbook', 
     'Malta tax with imputation and NID',
     '{"cit_rate": 0.35, "vat_rate": 0.18, "authority": "CFR", "imputation": true}'::jsonb, true)
ON CONFLICT (jurisdiction, engagement_type, version) DO NOTHING;

-- Canada Accounting Playbook
INSERT INTO playbooks (id, jurisdiction, engagement_type, version, name, description, config_json, is_active) VALUES
    ('33333333-3333-3333-3333-333333333307', 'CA', 'accounting', '1.0.0', 
     'Canada Accounting Playbook', 
     'ASPE/IFRS accounting for Canada',
     '{"frameworks": ["ASPE", "IFRS"], "regulator": "CPA Canada"}'::jsonb, true)
ON CONFLICT (jurisdiction, engagement_type, version) DO NOTHING;

-- Canada Audit Playbook
INSERT INTO playbooks (id, jurisdiction, engagement_type, version, name, description, config_json, is_active) VALUES
    ('33333333-3333-3333-3333-333333333308', 'CA', 'audit', '1.0.0', 
     'Canada Audit Playbook', 
     'CAS-based audit engagement for Canada',
     '{"framework": "CAS", "regulator": "CPA Canada"}'::jsonb, true)
ON CONFLICT (jurisdiction, engagement_type, version) DO NOTHING;

-- Canada Tax Playbook
INSERT INTO playbooks (id, jurisdiction, engagement_type, version, name, description, config_json, is_active) VALUES
    ('33333333-3333-3333-3333-333333333309', 'CA', 'tax', '1.0.0', 
     'Canada Tax Playbook', 
     'Canada tax with GST/HST and T2',
     '{"gst_rate": 0.05, "authority": "CRA"}'::jsonb, true)
ON CONFLICT (jurisdiction, engagement_type, version) DO NOTHING;

-- ============================================================================
-- DEMO ENGAGEMENTS
-- ============================================================================

-- Rwanda accounting engagement
INSERT INTO engagements (
    id, client_id, firm_id, type, name, description,
    period_start, period_end, status, phase,
    playbook_id
) VALUES (
    '44444444-4444-4444-4444-444444444441',
    '22222222-2222-2222-2222-222222222221',
    '11111111-1111-1111-1111-111111111111',
    'accounting',
    '2025 Annual Accounts - Kigali Tech',
    'Annual accounting and financial statement preparation',
    '2025-01-01',
    '2025-12-31',
    'active',
    'planning',
    '33333333-3333-3333-3333-333333333301'
) ON CONFLICT (id) DO NOTHING;

-- Malta audit engagement
INSERT INTO engagements (
    id, client_id, firm_id, type, name, description,
    period_start, period_end, status, phase,
    playbook_id, materiality_overall, materiality_performance
) VALUES (
    '44444444-4444-4444-4444-444444444442',
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'audit',
    '2025 Statutory Audit - Med Trading',
    'Annual statutory audit for MBR filing',
    '2025-01-01',
    '2025-12-31',
    'active',
    'planning',
    '33333333-3333-3333-3333-333333333305',
    25000.00,
    18750.00
) ON CONFLICT (id) DO NOTHING;

-- Canada tax engagement
INSERT INTO engagements (
    id, client_id, firm_id, type, name, description,
    period_start, period_end, status, phase,
    playbook_id
) VALUES (
    '44444444-4444-4444-4444-444444444443',
    '22222222-2222-2222-2222-222222222223',
    '11111111-1111-1111-1111-111111111111',
    'tax',
    '2025 T2 Corporate Tax - Maple Leaf',
    'Corporate tax return and GST/HST filing',
    '2025-01-01',
    '2025-12-31',
    'active',
    'planning',
    '33333333-3333-3333-3333-333333333309'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE TASKS (for demo engagement)
-- ============================================================================

INSERT INTO tasks (engagement_id, title, description, phase, status, template_key, estimated_hours) VALUES
    ('44444444-4444-4444-4444-444444444441', 'Review prior period financials', 'Analyze PY financial statements', 'planning', 'pending', 'acc-1', 4),
    ('44444444-4444-4444-4444-444444444441', 'Chart of accounts review', 'Review and update COA per RRA', 'planning', 'pending', 'acc-2', 2),
    ('44444444-4444-4444-4444-444444444442', 'Engagement acceptance', 'Independence and acceptance', 'planning', 'completed', 'aud-1', 2),
    ('44444444-4444-4444-4444-444444444442', 'Risk assessment', 'Risk assessment per ISA 315', 'planning', 'in_progress', 'aud-2', 6),
    ('44444444-4444-4444-4444-444444444443', 'Gather T-slips', 'Collect T4, T4A, T5 slips', 'planning', 'pending', 'tax-1', 2)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify seed data:
-- SELECT * FROM jurisdictions;
-- SELECT * FROM firms;
-- SELECT * FROM clients;
-- SELECT * FROM playbooks;
-- SELECT * FROM engagements;
-- SELECT * FROM tasks;

RAISE NOTICE 'Seed data loaded successfully!';
RAISE NOTICE 'Jurisdictions: RW, MT, CA';
RAISE NOTICE 'Demo firm: Demo Accounting Firm';
RAISE NOTICE 'Demo clients: 3 (one per jurisdiction)';
RAISE NOTICE 'Playbooks: 9 (3 jurisdictions x 3 types)';
RAISE NOTICE 'Engagements: 3 sample engagements';
