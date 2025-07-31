-- Phase 1: Extend user_profiles for onboarding data
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS momo_number text,
ADD COLUMN IF NOT EXISTS momo_code text,
ADD COLUMN IF NOT EXISTS onboarding_stage text DEFAULT 'initial',
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone;

-- Phase 5: Create pending onboarding tables
CREATE TABLE IF NOT EXISTS pending_drivers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  phone_number text,
  number_plate text,
  logbook_photo_url text,
  momo_number text,
  ocr_data jsonb DEFAULT '{}',
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pending_businesses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  phone_number text,
  business_name text,
  category text,
  address text,
  momo_code text,
  lat numeric,
  lng numeric,
  ocr_data jsonb DEFAULT '{}',
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE pending_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_businesses ENABLE ROW LEVEL SECURITY;

-- RLS policies for pending tables
CREATE POLICY "System can manage pending drivers" ON pending_drivers
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System can manage pending businesses" ON pending_businesses  
FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_drivers_user_id ON pending_drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_drivers_status ON pending_drivers(status);
CREATE INDEX IF NOT EXISTS idx_pending_businesses_user_id ON pending_businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_businesses_status ON pending_businesses(status);

-- Add updated_at trigger for pending tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pending_drivers_updated_at
  BEFORE UPDATE ON pending_drivers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pending_businesses_updated_at  
  BEFORE UPDATE ON pending_businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();