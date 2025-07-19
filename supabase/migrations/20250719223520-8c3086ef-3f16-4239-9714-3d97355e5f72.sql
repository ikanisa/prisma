-- ===================================================================
-- PostGIS setup + helper RPCs + Row-Level Security (easyMO Trips)
-- ===================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Enhanced driver_trips table (if not exists, or alter existing)
DO $$
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_trips' AND column_name = 'driver_phone') THEN
    ALTER TABLE public.driver_trips ADD COLUMN driver_phone TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_trips' AND column_name = 'from_text') THEN
    ALTER TABLE public.driver_trips ADD COLUMN from_text TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_trips' AND column_name = 'to_text') THEN
    ALTER TABLE public.driver_trips ADD COLUMN to_text TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_trips' AND column_name = 'from_geom') THEN
    ALTER TABLE public.driver_trips ADD COLUMN from_geom GEOMETRY(Point,4326);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_trips' AND column_name = 'to_geom') THEN
    ALTER TABLE public.driver_trips ADD COLUMN to_geom GEOMETRY(Point,4326);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_trips' AND column_name = 'inserted_at') THEN
    ALTER TABLE public.driver_trips ADD COLUMN inserted_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 3. Enhanced passenger_intents table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'passenger_intents' AND column_name = 'from_text') THEN
    ALTER TABLE public.passenger_intents ADD COLUMN from_text TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'passenger_intents' AND column_name = 'to_text') THEN
    ALTER TABLE public.passenger_intents ADD COLUMN to_text TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'passenger_intents' AND column_name = 'seats_needed') THEN
    ALTER TABLE public.passenger_intents ADD COLUMN seats_needed SMALLINT CHECK (seats_needed > 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'passenger_intents' AND column_name = 'max_price_rwf') THEN
    ALTER TABLE public.passenger_intents ADD COLUMN max_price_rwf INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'passenger_intents' AND column_name = 'from_geom') THEN
    ALTER TABLE public.passenger_intents ADD COLUMN from_geom GEOMETRY(Point,4326);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'passenger_intents' AND column_name = 'to_geom') THEN
    ALTER TABLE public.passenger_intents ADD COLUMN to_geom GEOMETRY(Point,4326);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'passenger_intents' AND column_name = 'inserted_at') THEN
    ALTER TABLE public.passenger_intents ADD COLUMN inserted_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 4. Create spatial indexes
CREATE INDEX IF NOT EXISTS idx_driver_trips_from_geom ON public.driver_trips USING GIST(from_geom);
CREATE INDEX IF NOT EXISTS idx_driver_trips_to_geom ON public.driver_trips USING GIST(to_geom);
CREATE INDEX IF NOT EXISTS idx_pass_intent_from_geom ON public.passenger_intents USING GIST(from_geom);
CREATE INDEX IF NOT EXISTS idx_pass_intent_to_geom ON public.passenger_intents USING GIST(to_geom);

-- 5. Enhanced RPC: Get nearby drivers for passengers
CREATE OR REPLACE FUNCTION public.fn_get_nearby_drivers(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius NUMERIC DEFAULT 2
)
RETURNS TABLE (
  trip_id       UUID,
  driver_phone  TEXT,
  from_text     TEXT,
  to_text       TEXT,
  seats         SMALLINT,
  price_rwf     INTEGER,
  distance_km   NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT
    dt.id AS trip_id,
    COALESCE(dt.driver_phone, dt.driver_id::TEXT) AS driver_phone,
    COALESCE(dt.from_text, ST_AsText(dt.origin), ST_AsText(dt.from_geom)) AS from_text,
    COALESCE(dt.to_text, ST_AsText(dt.destination), ST_AsText(dt.to_geom)) AS to_text,
    dt.seats,
    dt.price_rwf,
    ROUND(
      ST_Distance(
        COALESCE(dt.from_geom, dt.origin)::GEOGRAPHY,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::GEOGRAPHY
      ) / 1000, 2
    ) AS distance_km
  FROM public.driver_trips dt
  WHERE dt.status = 'active'
    AND dt.seats > 0
    AND (dt.from_geom IS NOT NULL OR dt.origin IS NOT NULL)
    AND ST_DWithin(
          COALESCE(dt.from_geom, dt.origin)::GEOGRAPHY,
          ST_SetSRID(ST_MakePoint(lng, lat), 4326)::GEOGRAPHY,
          radius * 1000
        )
  ORDER BY distance_km ASC, COALESCE(dt.inserted_at, dt.created_at) DESC;
$$;

-- 6. RPC: Get nearby passengers for drivers
CREATE OR REPLACE FUNCTION public.fn_get_nearby_passengers(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius NUMERIC DEFAULT 2
)
RETURNS TABLE (
  intent_id       UUID,
  passenger_phone TEXT,
  from_text       TEXT,
  to_text         TEXT,
  seats_needed    SMALLINT,
  max_price_rwf   INTEGER,
  distance_km     NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT
    pi.id AS intent_id,
    pi.passenger_phone,
    COALESCE(pi.from_text, ST_AsText(pi.pickup), ST_AsText(pi.from_geom)) AS from_text,
    COALESCE(pi.to_text, ST_AsText(pi.dropoff), ST_AsText(pi.to_geom)) AS to_text,
    COALESCE(pi.seats_needed, pi.seats) AS seats_needed,
    pi.max_price_rwf,
    ROUND(
      ST_Distance(
        COALESCE(pi.from_geom, pi.pickup)::GEOGRAPHY,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::GEOGRAPHY
      ) / 1000, 2
    ) AS distance_km
  FROM public.passenger_intents pi
  WHERE pi.status = 'open'
    AND (pi.from_geom IS NOT NULL OR pi.pickup IS NOT NULL)
    AND ST_DWithin(
          COALESCE(pi.from_geom, pi.pickup)::GEOGRAPHY,
          ST_SetSRID(ST_MakePoint(lng, lat), 4326)::GEOGRAPHY,
          radius * 1000
        )
  ORDER BY distance_km ASC, COALESCE(pi.inserted_at, pi.created_at) DESC;
$$;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION public.fn_get_nearby_drivers TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_nearby_passengers TO anon, authenticated;

-- 8. Row-Level Security Policies
ALTER TABLE public.driver_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passenger_intents ENABLE ROW LEVEL SECURITY;

-- Driver trips policies
DROP POLICY IF EXISTS "driver can see own trips" ON public.driver_trips;
CREATE POLICY "driver can see own trips" ON public.driver_trips
  FOR SELECT 
  USING (
    COALESCE(driver_phone, driver_id::TEXT) = 
    COALESCE(
      current_setting('request.jwt.claims', true)::json->>'phone',
      auth.uid()::TEXT
    )
  );

DROP POLICY IF EXISTS "driver can insert trips" ON public.driver_trips;
CREATE POLICY "driver can insert trips" ON public.driver_trips
  FOR INSERT 
  WITH CHECK (
    COALESCE(driver_phone, driver_id::TEXT) = 
    COALESCE(
      current_setting('request.jwt.claims', true)::json->>'phone',
      auth.uid()::TEXT
    )
  );

DROP POLICY IF EXISTS "driver can update own trips" ON public.driver_trips;
CREATE POLICY "driver can update own trips" ON public.driver_trips
  FOR UPDATE 
  USING (
    COALESCE(driver_phone, driver_id::TEXT) = 
    COALESCE(
      current_setting('request.jwt.claims', true)::json->>'phone',
      auth.uid()::TEXT
    )
  );

-- Passenger intents policies  
DROP POLICY IF EXISTS "passenger can see own intents" ON public.passenger_intents;
CREATE POLICY "passenger can see own intents" ON public.passenger_intents
  FOR SELECT 
  USING (
    passenger_phone = 
    COALESCE(
      current_setting('request.jwt.claims', true)::json->>'phone',
      auth.uid()::TEXT
    )
  );

DROP POLICY IF EXISTS "passenger can insert intents" ON public.passenger_intents;
CREATE POLICY "passenger can insert intents" ON public.passenger_intents
  FOR INSERT 
  WITH CHECK (
    passenger_phone = 
    COALESCE(
      current_setting('request.jwt.claims', true)::json->>'phone',
      auth.uid()::TEXT
    )
  );

DROP POLICY IF EXISTS "passenger can update own intents" ON public.passenger_intents;
CREATE POLICY "passenger can update own intents" ON public.passenger_intents
  FOR UPDATE 
  USING (
    passenger_phone = 
    COALESCE(
      current_setting('request.jwt.claims', true)::json->>'phone',
      auth.uid()::TEXT
    )
  );

-- 9. Allow public read access for active trips (for matching)
DROP POLICY IF EXISTS "public can view active trips" ON public.driver_trips;
CREATE POLICY "public can view active trips" ON public.driver_trips
  FOR SELECT 
  USING (status = 'active');

DROP POLICY IF EXISTS "public can view open intents" ON public.passenger_intents;
CREATE POLICY "public can view open intents" ON public.passenger_intents
  FOR SELECT 
  USING (status = 'open');

-- 10. Update existing trips_and_intents view to use new columns
DROP VIEW IF EXISTS public.trips_and_intents;
CREATE OR REPLACE VIEW public.trips_and_intents AS
SELECT  
    dt.id,
    'driver_trip'::TEXT as type,
    COALESCE(dt.driver_phone, dt.driver_id::TEXT) as user_phone,
    COALESCE(dt.from_text, ST_AsText(dt.origin)) as from_text,
    COALESCE(dt.to_text, ST_AsText(dt.destination)) as to_text, 
    dt.price_rwf,
    dt.seats,
    dt.status,
    COALESCE(dt.inserted_at, dt.created_at) as created_at,
    COALESCE(dt.updated_at, dt.created_at) as updated_at
FROM public.driver_trips dt
UNION ALL
SELECT  
    pi.id,
    'passenger_intent'::TEXT as type,
    pi.passenger_phone as user_phone,
    COALESCE(pi.from_text, ST_AsText(pi.pickup)) as from_text,
    COALESCE(pi.to_text, ST_AsText(pi.dropoff)) as to_text,
    pi.max_price_rwf as price_rwf,
    COALESCE(pi.seats_needed, pi.seats) as seats,
    pi.status,
    COALESCE(pi.inserted_at, pi.created_at) as created_at, 
    COALESCE(pi.updated_at, pi.created_at) as updated_at
FROM public.passenger_intents pi;

-- Grant access to the view
GRANT SELECT ON public.trips_and_intents TO authenticated, anon;