-- Create farmers table
CREATE TABLE IF NOT EXISTS farmers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp text UNIQUE,
  full_name text,
  district text,
  crops text[],
  joined_at timestamptz DEFAULT now(),
  status text DEFAULT 'active',
  listings_count integer DEFAULT 0,
  location text
);

-- Create produce_drafts table
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

-- Create produce_listings table
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

-- Create produce_matches table
CREATE TABLE IF NOT EXISTS produce_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES produce_listings(id),
  buyer_id uuid REFERENCES users(id),
  required_qty numeric,
  matched_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled'))
);

-- Create market_prices table for price tracking
CREATE TABLE IF NOT EXISTS market_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text,
  price_per_kg numeric,
  district text,
  source text DEFAULT 'MINAGRI',
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE produce_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE produce_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE produce_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for farmers
CREATE POLICY "Admin full access to farmers" 
ON farmers FOR ALL 
USING (is_admin());

CREATE POLICY "System can manage farmers" 
ON farmers FOR ALL 
WITH CHECK (true);

-- RLS Policies for produce_drafts
CREATE POLICY "Farmers can view own drafts" 
ON produce_drafts FOR SELECT 
USING (farmer_id IN (
  SELECT id FROM farmers WHERE whatsapp = auth.jwt() ->> 'phone'
));

CREATE POLICY "Admin can view all drafts" 
ON produce_drafts FOR ALL 
USING (is_admin());

CREATE POLICY "System can manage drafts" 
ON produce_drafts FOR ALL 
WITH CHECK (true);

-- RLS Policies for produce_listings
CREATE POLICY "Public can view active listings" 
ON produce_listings FOR SELECT 
USING (status = 'active');

CREATE POLICY "Farmers can manage own listings" 
ON produce_listings FOR ALL 
USING (farmer_id IN (
  SELECT id FROM farmers WHERE whatsapp = auth.jwt() ->> 'phone'
));

CREATE POLICY "Admin can manage all listings" 
ON produce_listings FOR ALL 
USING (is_admin());

CREATE POLICY "System can manage listings" 
ON produce_listings FOR ALL 
WITH CHECK (true);

-- RLS Policies for produce_matches
CREATE POLICY "Buyers can view own matches" 
ON produce_matches FOR SELECT 
USING (buyer_id = auth.uid());

CREATE POLICY "Admin can manage all matches" 
ON produce_matches FOR ALL 
USING (is_admin());

CREATE POLICY "System can manage matches" 
ON produce_matches FOR ALL 
WITH CHECK (true);

-- RLS Policies for market_prices
CREATE POLICY "Public can view market prices" 
ON market_prices FOR SELECT 
USING (true);

CREATE POLICY "System can manage market prices" 
ON market_prices FOR ALL 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_farmers_whatsapp ON farmers(whatsapp);
CREATE INDEX IF NOT EXISTS idx_farmers_district ON farmers(district);
CREATE INDEX IF NOT EXISTS idx_produce_listings_status ON produce_listings(status);
CREATE INDEX IF NOT EXISTS idx_produce_listings_product ON produce_listings(product_name);
CREATE INDEX IF NOT EXISTS idx_produce_listings_district ON produce_listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_produce_matches_status ON produce_matches(status);
CREATE INDEX IF NOT EXISTS idx_market_prices_product ON market_prices(product_name);

-- Create function to update farmers listing count
CREATE OR REPLACE FUNCTION update_farmer_listing_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE farmers 
    SET listings_count = listings_count + 1 
    WHERE id = NEW.farmer_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE farmers 
    SET listings_count = listings_count - 1 
    WHERE id = OLD.farmer_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for listing count
CREATE TRIGGER farmer_listing_count_trigger
  AFTER INSERT OR DELETE ON produce_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_farmer_listing_count();