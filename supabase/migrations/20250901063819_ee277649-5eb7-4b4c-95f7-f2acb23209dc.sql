-- First check and fix the organizations table structure
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan text;

-- Simple demo data without the plan column dependency
INSERT INTO organizations(id, slug, name) 
VALUES (gen_random_uuid(), 'demo', 'Demo Org') 
ON CONFLICT (slug) DO NOTHING;

-- Update to add plan if the row exists
UPDATE organizations SET plan = 'dev' WHERE slug = 'demo' AND plan IS NULL;