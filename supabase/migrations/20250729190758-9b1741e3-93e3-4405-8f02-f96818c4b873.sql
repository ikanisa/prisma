-- Add preferred_service to user_profiles for memory enrichment
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS preferred_service TEXT;

-- Create temporary_cache table for storing transaction data
CREATE TABLE IF NOT EXISTS temporary_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on temporary_cache
ALTER TABLE temporary_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies for temporary_cache (service-level access)
CREATE POLICY "Service can access cache" ON temporary_cache
FOR ALL USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_temporary_cache_key ON temporary_cache(key);
CREATE INDEX IF NOT EXISTS idx_temporary_cache_expires ON temporary_cache(expires_at);

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM temporary_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for the cache cleanup function
COMMENT ON FUNCTION cleanup_expired_cache() IS 'Removes expired entries from temporary_cache table';

-- Add constraint to ensure expires_at is in the future
ALTER TABLE temporary_cache 
ADD CONSTRAINT check_expires_future CHECK (expires_at > created_at);