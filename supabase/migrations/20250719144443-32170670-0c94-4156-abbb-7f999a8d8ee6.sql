-- Create farmer produce tables (only new tables, avoid existing policies)
CREATE TABLE IF NOT EXISTS produce_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid REFERENCES farmers(id),
  product_name text,
  quantity numeric,
  unit text CHECK (unit IN ('kg','ton','bunch','crate')),
  price numeric,
  photo_url text,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS produce_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid REFERENCES farmers(id),
  product_name text,
  quantity numeric,
  unit text,
  price numeric,
  photo_url text,
  grade text,
  status text CHECK (status IN ('active','paused','sold','expired')),
  views integer DEFAULT 0,
  matched_order_id uuid,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS produce_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES produce_listings(id),
  buyer_id uuid REFERENCES users(id),
  required_qty numeric,
  matched_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled'))
);

CREATE TABLE IF NOT EXISTS market_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text,
  price_per_kg numeric,
  district text,
  source text DEFAULT 'MINAGRI',
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE produce_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE produce_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE produce_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for new tables
CREATE POLICY "System can manage produce_drafts" 
ON produce_drafts FOR ALL 
WITH CHECK (true);

CREATE POLICY "System can manage produce_listings" 
ON produce_listings FOR ALL 
WITH CHECK (true);

CREATE POLICY "System can manage produce_matches" 
ON produce_matches FOR ALL 
WITH CHECK (true);

CREATE POLICY "System can manage market_prices" 
ON market_prices FOR ALL 
WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_produce_listings_status ON produce_listings(status);
CREATE INDEX IF NOT EXISTS idx_produce_listings_product ON produce_listings(product_name);
CREATE INDEX IF NOT EXISTS idx_produce_matches_status ON produce_matches(status);
CREATE INDEX IF NOT EXISTS idx_market_prices_product ON market_prices(product_name);