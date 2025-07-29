-- Create QR codes storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qr_codes', 'qr_codes', true)
ON CONFLICT (id) DO NOTHING;

-- Add vector and geo columns to businesses if they don't exist
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS vector vector(768),
ADD COLUMN IF NOT EXISTS geo geometry(POINT, 4326),
ADD COLUMN IF NOT EXISTS tags text[];

-- Create indexes for efficient searching (only on existing columns)
CREATE INDEX IF NOT EXISTS businesses_vector_idx ON businesses USING ivfflat (vector vector_cosine_ops);
CREATE INDEX IF NOT EXISTS businesses_geo_idx ON businesses USING gist(geo);
CREATE INDEX IF NOT EXISTS businesses_tags_idx ON businesses USING gin(tags);

-- Update geo column from lat/lng if they exist  
UPDATE businesses 
SET geo = ST_MakePoint(lng, lat)::geometry(POINT, 4326)
WHERE lat IS NOT NULL AND lng IS NOT NULL AND geo IS NULL;