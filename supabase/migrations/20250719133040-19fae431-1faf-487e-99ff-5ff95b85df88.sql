-- ===============================================
-- easyMO Driver System - Fixed Schema Implementation
-- ===============================================

-- Update drivers table to match blueprint
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS plate_number text;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS momo_number text;

-- Update existing trips table instead of recreating
ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_location text;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS dropoff_location text; 
ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_coords geography(Point,4326);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS dropoff_coords geography(Point,4326);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS price int;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Create driver_sessions table for live tracking
CREATE TABLE IF NOT EXISTS driver_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE,
  status text CHECK (status IN ('online','offline')) DEFAULT 'online',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  last_location geography(Point,4326),
  accuracy numeric,
  battery_level int,
  created_at timestamptz DEFAULT now()
);

-- Create trip_events for event tracking
CREATE TABLE IF NOT EXISTS trip_events (
  id bigserial PRIMARY KEY,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  event text NOT NULL,
  event_time timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Update driver_wallet to match blueprint
ALTER TABLE driver_wallet ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE driver_wallet ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create payouts table
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE,
  amount int NOT NULL,
  momo_txn_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  requested_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_sessions_driver_id ON driver_sessions(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_sessions_status ON driver_sessions(status);
CREATE INDEX IF NOT EXISTS idx_trip_events_trip_id ON trip_events(trip_id);
CREATE INDEX IF NOT EXISTS idx_payouts_driver_id ON payouts(driver_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);

-- Enable Row Level Security
ALTER TABLE driver_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for drivers (can only see their own data)
CREATE POLICY "Drivers read own sessions" ON driver_sessions
  FOR SELECT USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers manage own sessions" ON driver_sessions
  FOR ALL USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers read own payouts" ON payouts
  FOR SELECT USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

-- Admin policies
CREATE POLICY "Admin manage driver_sessions" ON driver_sessions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin manage trip_events" ON trip_events
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin manage payouts" ON payouts
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- System policies for edge functions
CREATE POLICY "System manage driver_sessions" ON driver_sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System manage trip_events" ON trip_events
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System manage payouts" ON payouts
  FOR ALL USING (true) WITH CHECK (true);

-- Triggers for automatic wallet creation
CREATE OR REPLACE FUNCTION create_driver_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO driver_wallet (driver_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (driver_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_driver_wallet ON drivers;
CREATE TRIGGER trigger_create_driver_wallet
  AFTER INSERT ON drivers
  FOR EACH ROW EXECUTE FUNCTION create_driver_wallet();

-- Trigger for payout processing
CREATE OR REPLACE FUNCTION process_trip_payout()
RETURNS TRIGGER AS $$
BEGIN
  -- When trip is marked as delivered, credit driver wallet
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    UPDATE driver_wallet 
    SET balance = balance + NEW.price * 0.8  -- 80% to driver, 20% platform fee
    WHERE driver_id = NEW.driver_id;
    
    -- Log the event
    INSERT INTO trip_events (trip_id, event, metadata)
    VALUES (NEW.id, 'payout_processed', jsonb_build_object('amount', NEW.price * 0.8));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_process_trip_payout ON trips;
CREATE TRIGGER trigger_process_trip_payout
  AFTER UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION process_trip_payout();

-- Enable realtime for admin dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE driver_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_events;