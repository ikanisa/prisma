-- Add missing columns to engagements table 
ALTER TABLE engagements 
ADD COLUMN IF NOT EXISTS year int,
ADD COLUMN IF NOT EXISTS frf text, 
ADD COLUMN IF NOT EXISTS eqr_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS materiality_set_id uuid;

-- Now apply a simplified demo seed
DO $$
DECLARE
  v_org uuid;
  v_eng uuid;
BEGIN
  -- Get or create demo org
  SELECT id INTO v_org FROM organizations WHERE slug='demo';
  IF v_org IS NULL THEN
    INSERT INTO organizations(slug,name,plan) VALUES ('demo','Demo Org','dev') RETURNING id INTO v_org;
  END IF;

  -- Create demo engagement 
  INSERT INTO engagements(id,org_id,client_id,year,status)
  VALUES (gen_random_uuid(),v_org,'ACME LTD',2025,'planned')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Demo org created: %', v_org;
END $$;