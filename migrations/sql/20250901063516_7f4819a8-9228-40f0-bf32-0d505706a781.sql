-- Fix the organizations table to match the expected schema
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan text;
-- Now apply the demo seed data with the corrected structure
DO $$
DECLARE
  v_org uuid; v_user uuid; v_eng uuid; v_mat uuid; v_client uuid;
  v_vendor_mt uuid; v_vendor_eu uuid; v_vendor_local uuid;
  v_cat_sw uuid; v_cat_prof uuid; v_cat_travel uuid;
  v_coa_cash uuid; v_coa_ap uuid; v_coa_revenue uuid; v_coa_vat_pay uuid; v_coa_expense uuid;
BEGIN
  SELECT id INTO v_org FROM organizations WHERE slug='demo';
  IF v_org IS NULL THEN
    INSERT INTO organizations(slug,name,plan) VALUES ('demo','Demo Org','dev') RETURNING id INTO v_org;
  END IF;

  IF EXISTS (SELECT 1 FROM categories WHERE org_id = v_org AND name = 'Software Subscriptions') THEN
    RAISE NOTICE 'Demo seed already present. Skipping duplicate block.';
    RETURN;
  END IF;

  -- COA
  v_coa_cash := gen_random_uuid(); v_coa_ap := gen_random_uuid();
  v_coa_revenue := gen_random_uuid(); v_coa_vat_pay := gen_random_uuid(); v_coa_expense := gen_random_uuid();
  INSERT INTO chart_of_accounts(id,org_id,code,name,type) VALUES
    (v_coa_cash,v_org,'1000','Cash and Cash Equivalents','asset'),
    (v_coa_ap,v_org,'2000','Accounts Payable','liability'),
    (v_coa_vat_pay,v_org,'2200','VAT Payable','liability'),
    (v_coa_revenue,v_org,'4000','Sales Revenue','revenue'),
    (v_coa_expense,v_org,'5100','Operating Expenses','expense')
  ON CONFLICT (org_id,code) DO NOTHING;

  -- Categories
  v_cat_sw := gen_random_uuid(); v_cat_prof := gen_random_uuid(); v_cat_travel := gen_random_uuid();
  INSERT INTO categories(id,org_id,name,description) VALUES
    (v_cat_sw,v_org,'Software Subscriptions','SaaS & cloud tools'),
    (v_cat_prof,v_org,'Professional Fees','Consulting, audit & legal'),
    (v_cat_travel,v_org,'Travel','Flights, hotels, taxis')
  ON CONFLICT (org_id,name) DO NOTHING;

  -- Vendors
  v_vendor_mt := gen_random_uuid(); v_vendor_eu := gen_random_uuid(); v_vendor_local := gen_random_uuid();
  INSERT INTO vendors(id,org_id,name,vat_number,country,extra) VALUES
    (v_vendor_mt,v_org,'Malta Telecom Ltd','MT12345678','MT','{}'),
    (v_vendor_eu,v_org,'EU Cloud GmbH','DE123456789','DE','{}'),
    (v_vendor_local,v_org,'Local Stationery','MT87654321','MT','{}')
  ON CONFLICT (org_id,name) DO NOTHING;

  INSERT INTO vendor_category_mappings(id,org_id,vendor_id,category_id,vat_code,confidence,examples) VALUES
    (gen_random_uuid(),v_org,v_vendor_mt,v_cat_prof,'MT_STD_18',0.9,'[]'::jsonb),
    (gen_random_uuid(),v_org,v_vendor_eu,v_cat_sw,'RC_EU_B2B_SERV',0.95,'[]'::jsonb),
    (gen_random_uuid(),v_org,v_vendor_local,v_cat_travel,'MT_STD_18',0.85,'[]'::jsonb)
  ON CONFLICT (org_id,vendor_id) DO NOTHING;

  -- VAT rules
  INSERT INTO vat_rules(org_id,name,rule,jurisdiction,effective_from) VALUES
    (v_org,'B2B services to EU (reverse charge)',
      jsonb_build_object('conditions',jsonb_build_object('seller_country','MT','buyer_in_eu',true,'supply_type','services','b2b',true),
                         'outcome',jsonb_build_object('treatment','Reverse charge','reverse_charge',true,'rate',0)),
      'MT',current_date),
    (v_org,'Local standard rate (MT 18%)',
      jsonb_build_object('conditions',jsonb_build_object('seller_country','MT','buyer_country','MT'),
                         'outcome',jsonb_build_object('treatment','Standard','reverse_charge',false,'rate',18)),
      'MT',current_date);

  -- Transactions
  INSERT INTO transactions(id,org_id,date,vendor_id,description,amount,currency,category_id,vat_code,confidence,source_ref) VALUES
    (gen_random_uuid(),v_org,current_date-20,v_vendor_mt,'Monthly telecom & bandwidth',-240.00,'EUR',v_cat_prof,'MT_STD_18',0.92,'INV-MT-1001'),
    (gen_random_uuid(),v_org,current_date-15,v_vendor_eu,'Cloud platform subscription',-899.00,'EUR',v_cat_sw,'RC_EU_B2B_SERV',0.97,'INV-DE-2001'),
    (gen_random_uuid(),v_org,current_date-10,v_vendor_local,'Team travel: client meeting',-350.00,'EUR',v_cat_travel,'MT_STD_18',0.80,'RCPT-LOC-3001');

  -- Engagement + materiality
  v_eng := gen_random_uuid();
  SELECT id INTO v_client FROM clients WHERE org_id = v_org AND name = 'ACME LTD';
  IF v_client IS NULL THEN
    INSERT INTO clients (org_id, name, contact_name, email, phone, country, industry, fiscal_year_end)
    VALUES (v_org, 'ACME LTD', 'Alex Turner', 'finance@acme.example', '+356000000', 'MT', 'Manufacturing', 'December 31')
    RETURNING id INTO v_client;
  END IF;

  INSERT INTO engagements(id,org_id,client_id,title,description,status,start_date,end_date,year,frf,eqr_required)
  VALUES (v_eng,v_org,v_client,'ACME Group - FY'||extract(year from now())::int,'Demo engagement seed','planned',current_date-30,current_date+335,extract(year from now())::int,'IFRS',false)
  ON CONFLICT (id) DO NOTHING;

  v_mat := gen_random_uuid();
  INSERT INTO materiality_sets(id,org_id,engagement_id,basis,basis_amount,pm,te_threshold,rationale)
  VALUES (v_mat,v_org,v_eng,'revenue',1500000.00,5250.00,157.50,'ISA 320 heuristic: 0.5% revenue; TE=3% PM');

  UPDATE engagements SET materiality_set_id = v_mat WHERE id = v_eng;

  -- RAG docs/chunks
  DECLARE v_doc1 uuid := gen_random_uuid();
  BEGIN
    INSERT INTO documents(id,org_id,source_name,source_url,mime,bytes,checksum,jurisdiction,effective_date,version)
    VALUES (v_doc1,v_org,'Malta VAT Act Overview','https://legislation.mt/eli/cap/406','text/plain',0,'seed-doc-1','MT',current_date-365,'2024-01');
    INSERT INTO chunks(id,org_id,document_id,chunk_index,content,embed_model) VALUES
      (gen_random_uuid(),v_org,v_doc1,0,'VAT in Malta standard rate 18% reverse charge for certain EU B2B services.','text-embedding-3-small');
  EXCEPTION WHEN others THEN NULL; END;

  RAISE NOTICE 'AAT seed complete for org demo (%).', v_org;
END $$;
