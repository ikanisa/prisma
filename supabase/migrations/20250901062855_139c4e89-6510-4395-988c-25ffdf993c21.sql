-- Now create the essential tables needed for demo seeding
CREATE TABLE IF NOT EXISTS chart_of_accounts(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code text NOT NULL, 
  name text NOT NULL, 
  type text NOT NULL,
  parent_id uuid REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  UNIQUE(org_id, code)
);

CREATE TABLE IF NOT EXISTS categories(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL, 
  description text
);

CREATE TABLE IF NOT EXISTS vendors(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL, 
  vat_number text, 
  country text, 
  extra jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS vendor_category_mappings(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  vat_code text, 
  confidence numeric, 
  examples jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(), 
  UNIQUE(org_id, vendor_id)
);

CREATE TABLE IF NOT EXISTS transactions(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date date NOT NULL,
  vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
  description text, 
  amount numeric NOT NULL, 
  currency text NOT NULL DEFAULT 'EUR',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  vat_code text, 
  confidence numeric, 
  source_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vat_rules(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL, 
  rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  jurisdiction text, 
  effective_from date, 
  effective_to date
);

CREATE TABLE IF NOT EXISTS engagements(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id text NOT NULL, 
  year int NOT NULL,
  status engagement_status NOT NULL DEFAULT 'planned',
  frf text, 
  eqr_required boolean NOT NULL DEFAULT false,
  materiality_set_id uuid, 
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS materiality_sets(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  basis text, 
  basis_amount numeric, 
  pm numeric, 
  te_threshold numeric, 
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS independence_checks(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  threats jsonb NOT NULL DEFAULT '[]'::jsonb,
  safeguards jsonb NOT NULL DEFAULT '[]'::jsonb,
  conclusion text, 
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS risks(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  assertion text, 
  description text, 
  likelihood int, 
  impact int,
  response_plan jsonb, 
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  source_url text,
  mime text, 
  bytes bigint, 
  checksum text,
  jurisdiction text, 
  effective_date date, 
  version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  content text NOT NULL,
  content_hash text GENERATED ALWAYS AS (encode(digest(coalesce(content,''), 'sha256'), 'hex')) STORED,
  embedding vector(1536),
  embed_model text,
  last_embedded_at timestamptz,
  UNIQUE (org_id, content_hash)
);

-- Enable RLS on all tables
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_category_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiality_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE independence_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;