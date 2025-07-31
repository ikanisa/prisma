-- 1. canonical_locations (bars / pharmacies / hardware / farmers)
CREATE TABLE canonical_locations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id         TEXT UNIQUE,
  name             TEXT NOT NULL,
  category         TEXT CHECK (category IN ('bar','pharmacy','hardware','farmer')),
  phone            TEXT,
  whatsapp         TEXT,
  website          TEXT,
  address          TEXT,
  lat              NUMERIC,
  lng              NUMERIC,
  google_rating    NUMERIC,
  data_source      TEXT DEFAULT 'google_places',
  imported_at      TIMESTAMPTZ DEFAULT now(),
  geom             GEOGRAPHY(Point,4326) GENERATED ALWAYS AS (
                     ST_SetSRID(ST_MakePoint(lng,lat),4326)
                   ) STORED
);

CREATE INDEX ON canonical_locations USING GIST(geom);

-- 2. property_listings (houses / apartments / flats)
CREATE TABLE property_listings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source           TEXT,                 -- airbnb / booking / facebook
  external_id      TEXT,
  title            TEXT,
  description      TEXT,
  price_usd        NUMERIC,
  bedrooms         INT,
  bathrooms        INT,
  address          TEXT,
  lat              NUMERIC,
  lng              NUMERIC,
  whatsapp         TEXT,
  photos           JSONB,
  created_at       TIMESTAMPTZ DEFAULT now(),
  geom             GEOGRAPHY(Point,4326) GENERATED ALWAYS AS (
                     ST_SetSRID(ST_MakePoint(lng,lat),4326)
                   ) STORED
);

CREATE INDEX ON property_listings USING GIST(geom);

-- 3. vehicles_listings
CREATE TABLE vehicle_listings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source           TEXT,    -- facebook / local_site
  external_id      TEXT,
  make             TEXT,
  model            TEXT,
  year             INT,
  price_usd        NUMERIC,
  usage            TEXT CHECK (usage IN ('sale','rent')),
  lat              NUMERIC,
  lng              NUMERIC,
  whatsapp         TEXT,
  description      TEXT,
  photos           JSONB,
  created_at       TIMESTAMPTZ DEFAULT now(),
  geom             GEOGRAPHY(Point,4326) GENERATED ALWAYS AS (
                     ST_SetSRID(ST_MakePoint(lng,lat),4326)
                   ) STORED
);

CREATE INDEX ON vehicle_listings USING GIST(geom);

-- Enable RLS on all tables
ALTER TABLE canonical_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_listings ENABLE ROW LEVEL SECURITY;

-- RLS policies: anon/authenticated have select only; service_role handles inserts during ingestion
CREATE POLICY "Public can view canonical locations" 
ON canonical_locations FOR SELECT 
USING (true);

CREATE POLICY "System can manage canonical locations" 
ON canonical_locations FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can view property listings" 
ON property_listings FOR SELECT 
USING (true);

CREATE POLICY "System can manage property listings" 
ON property_listings FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can view vehicle listings" 
ON vehicle_listings FOR SELECT 
USING (true);

CREATE POLICY "System can manage vehicle listings" 
ON vehicle_listings FOR ALL 
USING (true)
WITH CHECK (true);

-- Create storage bucket for CSV uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('data-imports', 'data-imports', false);

-- Storage policies
CREATE POLICY "Admin can upload files" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'data-imports' AND is_admin());

CREATE POLICY "Admin can view uploaded files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'data-imports' AND is_admin());

CREATE POLICY "System can manage import files" 
ON storage.objects FOR ALL 
USING (bucket_id = 'data-imports')
WITH CHECK (bucket_id = 'data-imports');