-- User profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT,
  momo_number TEXT,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User locations table
CREATE TABLE IF NOT EXISTS public.user_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User conversation state
CREATE TABLE IF NOT EXISTS public.user_conversation_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  current_flow TEXT,
  flow_data JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payments table for QR and transactions
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_phone TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'RWF',
  type TEXT NOT NULL, -- 'receive', 'send', 'split'
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  qr_url TEXT,
  reference TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Driver profiles and trips
CREATE TABLE IF NOT EXISTS public.driver_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT,
  vehicle_type TEXT DEFAULT 'moto',
  license_plate TEXT,
  is_online BOOLEAN DEFAULT false,
  current_location GEOMETRY(POINT, 4326),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Driver trips (posted availability)
CREATE TABLE IF NOT EXISTS public.driver_trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES driver_profiles(id),
  origin_text TEXT NOT NULL,
  destination_text TEXT NOT NULL,
  origin_location GEOMETRY(POINT, 4326),
  destination_location GEOMETRY(POINT, 4326),
  departure_time TIMESTAMP WITH TIME ZONE,
  available_seats INTEGER DEFAULT 1,
  price_rwf INTEGER,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Passenger intents (ride requests)
CREATE TABLE IF NOT EXISTS public.passenger_intents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  passenger_phone TEXT NOT NULL,
  origin_text TEXT NOT NULL,
  destination_text TEXT NOT NULL,
  origin_location GEOMETRY(POINT, 4326),
  destination_location GEOMETRY(POINT, 4326),
  desired_time TIMESTAMP WITH TIME ZONE,
  max_price INTEGER,
  num_passengers INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS public.trip_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_trip_id UUID REFERENCES driver_trips(id),
  passenger_intent_id UUID REFERENCES passenger_intents(id),
  passenger_phone TEXT NOT NULL,
  driver_phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
  confirmed_price INTEGER,
  meeting_point TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- WhatsApp contacts table
CREATE TABLE IF NOT EXISTS public.wa_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wa_id TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  profile_name TEXT,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_business BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Incoming messages log
CREATE TABLE IF NOT EXISTS public.incoming_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_number TEXT NOT NULL,
  message_type TEXT NOT NULL,
  message_text TEXT,
  raw_payload JSONB,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_conversation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passenger_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incoming_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies - System access for WhatsApp functions
CREATE POLICY "System can manage user_profiles" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage user_locations" ON public.user_locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage user_conversation_state" ON public.user_conversation_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage driver_profiles" ON public.driver_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage driver_trips" ON public.driver_trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage passenger_intents" ON public.passenger_intents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage trip_bookings" ON public.trip_bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage wa_contacts" ON public.wa_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage incoming_messages" ON public.incoming_messages FOR ALL USING (true) WITH CHECK (true);

-- Create spatial indexes for location queries
CREATE INDEX IF NOT EXISTS idx_driver_profiles_location ON public.driver_profiles USING GIST (current_location);
CREATE INDEX IF NOT EXISTS idx_driver_trips_origin ON public.driver_trips USING GIST (origin_location);
CREATE INDEX IF NOT EXISTS idx_driver_trips_destination ON public.driver_trips USING GIST (destination_location);
CREATE INDEX IF NOT EXISTS idx_passenger_intents_origin ON public.passenger_intents USING GIST (origin_location);
CREATE INDEX IF NOT EXISTS idx_passenger_intents_destination ON public.passenger_intents USING GIST (destination_location);

-- Function to get nearby drivers
CREATE OR REPLACE FUNCTION get_nearby_drivers(user_lat DECIMAL, user_lng DECIMAL, radius_km INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  name TEXT,
  vehicle_type TEXT,
  distance DECIMAL,
  estimated_fare INTEGER,
  phone_number TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.id,
    dp.name,
    dp.vehicle_type,
    ROUND(ST_Distance(dp.current_location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326))::numeric / 1000, 2) as distance,
    (1200 + ROUND(ST_Distance(dp.current_location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326))::numeric / 1000 * 200))::INTEGER as estimated_fare,
    dp.phone_number
  FROM driver_profiles dp
  WHERE dp.is_online = true
    AND dp.current_location IS NOT NULL
    AND ST_DWithin(dp.current_location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326), radius_km * 1000)
  ORDER BY distance ASC;
END;
$$;