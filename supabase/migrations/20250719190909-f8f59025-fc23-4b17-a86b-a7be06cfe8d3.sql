-- Create centralized documents table first
CREATE TABLE public.centralized_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  document_type TEXT,
  agent_scope TEXT DEFAULT 'general',
  status TEXT DEFAULT 'active',
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  openai_file_id TEXT,
  file_purpose TEXT DEFAULT 'assistants'
);

-- Enable RLS
ALTER TABLE public.centralized_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admin can manage centralized documents" ON public.centralized_documents
  FOR ALL USING (is_admin());

-- Create driver trips table with PostGIS support
CREATE TABLE public.driver_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES auth.users(id),
  origin GEOGRAPHY(Point, 4326),
  destination GEOGRAPHY(Point, 4326),
  price_rwf INTEGER,
  seats INTEGER DEFAULT 1,
  departure_time TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_driver_trips_origin ON driver_trips USING GIST(origin);
CREATE INDEX idx_driver_trips_destination ON driver_trips USING GIST(destination);
CREATE INDEX idx_driver_trips_status ON driver_trips(status);
CREATE INDEX idx_driver_trips_driver_id ON driver_trips(driver_id);

-- Create passenger intents table
CREATE TABLE public.passenger_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_phone TEXT NOT NULL,
  pickup GEOGRAPHY(Point, 4326),
  dropoff GEOGRAPHY(Point, 4326),
  pickup_address TEXT,
  dropoff_address TEXT,
  seats INTEGER DEFAULT 1,
  max_fare_rwf INTEGER,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_passenger_intents_pickup ON passenger_intents USING GIST(pickup);
CREATE INDEX idx_passenger_intents_dropoff ON passenger_intents USING GIST(dropoff);
CREATE INDEX idx_passenger_intents_status ON passenger_intents(status);
CREATE INDEX idx_passenger_intents_phone ON passenger_intents(passenger_phone);

-- Update bookings table to reference new trip system
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS driver_trip_id UUID REFERENCES driver_trips(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS passenger_intent_id UUID REFERENCES passenger_intents(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS fare_rwf INTEGER;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'whatsapp';

-- Create assistant configurations table (assistant_id can be null initially)
CREATE TABLE public.assistant_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id TEXT UNIQUE,
  name TEXT NOT NULL,
  model TEXT DEFAULT 'gpt-4o',
  instructions TEXT,
  tools JSONB DEFAULT '[]'::jsonb,
  temperature DECIMAL DEFAULT 0.4,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create tool definitions table
CREATE TABLE public.tool_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  parameters JSONB NOT NULL,
  implementation_function TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create evaluation results table
CREATE TABLE public.evaluation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_name TEXT NOT NULL,
  test_prompt TEXT NOT NULL,
  expected_output TEXT,
  actual_output TEXT,
  score DECIMAL,
  passed BOOLEAN,
  model_used TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create fine tune jobs table
CREATE TABLE public.fine_tune_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  openai_job_id TEXT UNIQUE,
  model_name TEXT,
  training_file_id TEXT,
  status TEXT DEFAULT 'queued',
  fine_tuned_model TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Create thread management table for OpenAI threads
CREATE TABLE public.conversation_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  thread_id TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active',
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conversation_threads_phone ON conversation_threads(phone_number);
CREATE INDEX idx_conversation_threads_thread_id ON conversation_threads(thread_id);

-- Add RLS policies for new tables
ALTER TABLE public.driver_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passenger_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fine_tune_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_threads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for driver_trips
CREATE POLICY "Drivers can manage own trips" ON public.driver_trips
  FOR ALL USING (driver_id = auth.uid());

CREATE POLICY "Public can view active trips" ON public.driver_trips
  FOR SELECT USING (status = 'active');

CREATE POLICY "System can manage driver trips" ON public.driver_trips
  FOR ALL USING (true);

-- RLS Policies for passenger_intents
CREATE POLICY "System can manage passenger intents" ON public.passenger_intents
  FOR ALL USING (true);

-- RLS Policies for assistant configs
CREATE POLICY "Admin can manage assistant configs" ON public.assistant_configs
  FOR ALL USING (is_admin());

-- RLS Policies for tool definitions
CREATE POLICY "Admin can manage tool definitions" ON public.tool_definitions
  FOR ALL USING (is_admin());

-- RLS Policies for evaluation results
CREATE POLICY "Admin can view evaluation results" ON public.evaluation_results
  FOR SELECT USING (is_admin());

CREATE POLICY "System can write evaluation results" ON public.evaluation_results
  FOR INSERT WITH CHECK (true);

-- RLS Policies for fine tune jobs
CREATE POLICY "Admin can manage fine tune jobs" ON public.fine_tune_jobs
  FOR ALL USING (is_admin());

-- RLS Policies for conversation threads
CREATE POLICY "System can manage conversation threads" ON public.conversation_threads
  FOR ALL USING (true);

-- Create function to get nearby drivers using PostGIS
CREATE OR REPLACE FUNCTION fn_get_nearby_drivers(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius DOUBLE PRECISION DEFAULT 2.0
) RETURNS TABLE (
  trip_id UUID,
  driver_id UUID,
  origin_lat DOUBLE PRECISION,
  origin_lng DOUBLE PRECISION,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  price_rwf INTEGER,
  seats INTEGER,
  distance_km DOUBLE PRECISION
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dt.id,
    dt.driver_id,
    ST_Y(dt.origin::geometry) as origin_lat,
    ST_X(dt.origin::geometry) as origin_lng,
    ST_Y(dt.destination::geometry) as destination_lat,
    ST_X(dt.destination::geometry) as destination_lng,
    dt.price_rwf,
    dt.seats,
    ST_Distance(
      dt.origin::geometry,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry
    ) / 1000.0 as distance_km
  FROM driver_trips dt
  WHERE dt.status = 'active'
    AND ST_DWithin(
      dt.origin::geometry,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry,
      radius * 1000  -- Convert km to meters
    )
  ORDER BY distance_km ASC
  LIMIT 20;
END;
$$;

-- Create function to find matching trips for passenger intent
CREATE OR REPLACE FUNCTION fn_find_matching_trips(
  intent_id UUID
) RETURNS TABLE (
  trip_id UUID,
  compatibility_score DOUBLE PRECISION
) LANGUAGE plpgsql AS $$
DECLARE
  intent_record RECORD;
BEGIN
  SELECT * INTO intent_record FROM passenger_intents WHERE id = intent_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    dt.id,
    -- Simple compatibility score based on pickup distance and seats
    (1.0 - LEAST(ST_Distance(dt.origin::geometry, intent_record.pickup::geometry) / 5000.0, 1.0)) * 0.7 +
    (CASE WHEN dt.seats >= intent_record.seats THEN 0.3 ELSE 0.0 END) as score
  FROM driver_trips dt
  WHERE dt.status = 'active'
    AND dt.seats >= intent_record.seats
    AND ST_DWithin(
      dt.origin::geometry,
      intent_record.pickup::geometry,
      5000  -- 5km pickup radius
    )
  ORDER BY score DESC
  LIMIT 10;
END;
$$;

-- Insert default assistant configuration (without assistant_id initially)
INSERT INTO public.assistant_configs (name, instructions, tools) VALUES
('easyMO Super-Agent', 
'You are Rwanda''s most helpful commerce assistant inside WhatsApp. Goals: help drivers list trips, passengers book rides, vendors list or sell, shoppers buy, and collect payment via MoMo QR. Always be concise, friendly, and include Kinyarwanda greetings when user language=rw.',
'[]'::jsonb)
ON CONFLICT DO NOTHING;

-- Insert default tool definitions
INSERT INTO public.tool_definitions (name, description, parameters, implementation_function) VALUES
('get_nearby_drivers', 'Return available driver trips near GPS coordinates', 
'{"type": "object", "properties": {"lat": {"type": "number"}, "lng": {"type": "number"}, "radius_km": {"type": "number", "default": 2}}, "required": ["lat", "lng"]}',
'fn_get_nearby_drivers'),
('create_booking', 'Confirm passenger-driver booking',
'{"type": "object", "properties": {"driver_trip_id": {"type": "string"}, "passenger_phone": {"type": "string"}, "pickup": {"type": "string"}, "dropoff": {"type": "string"}, "fare_rwf": {"type": "number"}}, "required": ["driver_trip_id", "passenger_phone"]}',
'create_booking'),
('list_properties', 'Search available properties for rent or sale',
'{"type": "object", "properties": {"location": {"type": "string"}, "property_type": {"type": "string"}, "max_price": {"type": "number"}, "bedrooms": {"type": "number"}}}',
'list_properties'),
('search_listings', 'Search marketplace listings by category and location',
'{"type": "object", "properties": {"category": {"type": "string"}, "location": {"type": "string"}, "max_price": {"type": "number"}, "query": {"type": "string"}}}',
'search_listings'),
('generate_payment_qr', 'Generate MoMo payment QR code',
'{"type": "object", "properties": {"amount": {"type": "number"}, "merchant_code": {"type": "string"}, "description": {"type": "string"}}, "required": ["amount", "merchant_code"]}',
'generate_payment_qr')
ON CONFLICT (name) DO NOTHING;