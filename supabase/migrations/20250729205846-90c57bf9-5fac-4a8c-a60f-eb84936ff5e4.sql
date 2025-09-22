-- Create user_locations table for geo functionality
CREATE TABLE IF NOT EXISTS user_locations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial index for efficient geo queries
CREATE INDEX IF NOT EXISTS idx_user_locations_gist ON user_locations USING GIST (POINT(lng, lat));

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);

-- Enable RLS
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "System can manage user locations" ON user_locations
FOR ALL USING (true) WITH CHECK (true);