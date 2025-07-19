-- Passenger System Database Schema

-- Create passengers table
CREATE TABLE public.passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  full_name TEXT,
  whatsapp_number TEXT,
  preferred_lang TEXT DEFAULT 'rw',
  total_rides INTEGER DEFAULT 0,
  avg_rating_given NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ride_requests table
CREATE TABLE public.ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID REFERENCES passengers(id),
  origin GEOGRAPHY(Point,4326),
  destination GEOGRAPHY(Point,4326),
  origin_address TEXT,
  destination_address TEXT,
  fare_estimate INTEGER,
  status TEXT CHECK (status IN ('pending','matched','cancelled','expired')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  matched_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ
);

-- Add passenger columns to trips table
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS passenger_id UUID REFERENCES passengers(id);
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS passenger_paid BOOLEAN DEFAULT false;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS fare_amount INTEGER;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS ride_request_id UUID REFERENCES ride_requests(id);

-- Create trip_ratings table
CREATE TABLE public.trip_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id),
  passenger_id UUID REFERENCES passengers(id),
  driver_id UUID REFERENCES drivers(id),
  stars INTEGER CHECK (stars BETWEEN 1 AND 5),
  tip_amount INTEGER DEFAULT 0,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create passenger_promos table
CREATE TABLE public.passenger_promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID REFERENCES passengers(id),
  promo_code TEXT NOT NULL,
  discount_percent INTEGER DEFAULT 0,
  discount_amount INTEGER DEFAULT 0,
  redeemed BOOLEAN DEFAULT false,
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all passenger tables
ALTER TABLE public.passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passenger_promos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for passengers
CREATE POLICY "Passengers can view own profile" ON passengers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Passengers can update own profile" ON passengers
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can manage passengers" ON passengers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin can manage passengers" ON passengers
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- RLS Policies for ride_requests
CREATE POLICY "Passengers can view own ride requests" ON ride_requests
  FOR SELECT USING (passenger_id IN (
    SELECT id FROM passengers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Passengers can create ride requests" ON ride_requests
  FOR INSERT WITH CHECK (passenger_id IN (
    SELECT id FROM passengers WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can manage ride requests" ON ride_requests
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin can view all ride requests" ON ride_requests
  FOR SELECT USING (is_admin());

-- RLS Policies for trip_ratings
CREATE POLICY "Passengers can view own ratings" ON trip_ratings
  FOR SELECT USING (passenger_id IN (
    SELECT id FROM passengers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Passengers can create ratings" ON trip_ratings
  FOR INSERT WITH CHECK (passenger_id IN (
    SELECT id FROM passengers WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can manage ratings" ON trip_ratings
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin can view all ratings" ON trip_ratings
  FOR SELECT USING (is_admin());

-- RLS Policies for passenger_promos
CREATE POLICY "Passengers can view own promos" ON passenger_promos
  FOR SELECT USING (passenger_id IN (
    SELECT id FROM passengers WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can manage promos" ON passenger_promos
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin can manage promos" ON passenger_promos
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Indexes for performance
CREATE INDEX idx_passengers_user_id ON passengers(user_id);
CREATE INDEX idx_passengers_whatsapp ON passengers(whatsapp_number);
CREATE INDEX idx_ride_requests_passenger_id ON ride_requests(passenger_id);
CREATE INDEX idx_ride_requests_status ON ride_requests(status);
CREATE INDEX idx_ride_requests_created_at ON ride_requests(created_at);
CREATE INDEX idx_trip_ratings_trip_id ON trip_ratings(trip_id);
CREATE INDEX idx_trip_ratings_driver_id ON trip_ratings(driver_id);
CREATE INDEX idx_passenger_promos_passenger_id ON passenger_promos(passenger_id);
CREATE INDEX idx_passenger_promos_code ON passenger_promos(promo_code);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_passengers_updated_at
    BEFORE UPDATE ON passengers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update driver ratings when new rating is added
CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE drivers 
    SET avg_rating = (
        SELECT AVG(stars) 
        FROM trip_ratings 
        WHERE driver_id = NEW.driver_id
    )
    WHERE id = NEW.driver_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_driver_rating_on_new_rating
    AFTER INSERT ON trip_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_driver_rating();

-- Enable realtime for passenger tables
ALTER PUBLICATION supabase_realtime ADD TABLE ride_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE passenger_promos;