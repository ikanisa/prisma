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
  v_client uuid;
BEGIN
  -- Get or create demo org
  SELECT id INTO v_org FROM organizations WHERE slug='demo';
  IF v_org IS NULL THEN
    INSERT INTO organizations(slug,name,plan) VALUES ('demo','Demo Org','dev') RETURNING id INTO v_org;
  END IF;

  -- Ensure demo client exists
  SELECT id INTO v_client FROM clients WHERE org_id = v_org AND name = 'ACME LTD';
  IF v_client IS NULL THEN
    INSERT INTO clients (org_id, name, contact_name, email, phone, country, industry, fiscal_year_end)
    VALUES (v_org, 'ACME LTD', 'Alex Turner', 'finance@acme.example', '+356000000', 'MT', 'Manufacturing', 'December 31')
    RETURNING id INTO v_client;
  END IF;

  v_eng := gen_random_uuid();
  INSERT INTO engagements(id,org_id,client_id,title,description,status,start_date,end_date,year,frf,eqr_required)
  VALUES (v_eng,v_org,v_client,'ACME Group - FY2025','Simplified demo engagement','planned',current_date-60,current_date+305,2025,'IFRS',false)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Demo org created: %', v_org;
END $$;
