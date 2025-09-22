-- =========================================
--  EXTENSIONS  (run once per project)
-- =========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================
--  TABLE: driver_trips (spatial version)
-- =========================================
CREATE TABLE IF NOT EXISTS public.driver_trips_spatial (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_phone      text,
  origin            geography(Point, 4326) NOT NULL,
  destination       geography(Point, 4326) NOT NULL,
  from_text         text NOT NULL,
  to_text           text NOT NULL,
  price_rwf         integer NOT NULL CHECK (price_rwf > 0),
  seats             integer NOT NULL DEFAULT 1 CHECK (seats >= 1),
  departure_time    timestamptz DEFAULT now(),
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  metadata          jsonb DEFAULT '{}',
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Spatial indexes for fast geo‑search
CREATE INDEX IF NOT EXISTS driver_trips_spatial_origin_idx      ON public.driver_trips_spatial USING gist (origin);
CREATE INDEX IF NOT EXISTS driver_trips_spatial_destination_idx ON public.driver_trips_spatial USING gist (destination);
CREATE INDEX IF NOT EXISTS driver_trips_spatial_status_idx      ON public.driver_trips_spatial (status);

-- =========================================
--  TABLE: passenger_intents_spatial
-- =========================================
CREATE TABLE IF NOT EXISTS public.passenger_intents_spatial (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_phone   text NOT NULL,
  pickup            geography(Point, 4326) NOT NULL,
  dropoff           geography(Point, 4326) NOT NULL,
  from_text         text NOT NULL,
  to_text           text NOT NULL,
  seats_needed      integer NOT NULL DEFAULT 1 CHECK (seats_needed >= 1),
  max_price_rwf     integer,
  status            text NOT NULL DEFAULT 'open' CHECK (status IN ('open','matched','cancelled')),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS passenger_intents_spatial_pickup_idx  ON public.passenger_intents_spatial USING gist (pickup);
CREATE INDEX IF NOT EXISTS passenger_intents_spatial_dropoff_idx ON public.passenger_intents_spatial USING gist (dropoff);
CREATE INDEX IF NOT EXISTS passenger_intents_spatial_status_idx  ON public.passenger_intents_spatial (status);

-- =========================================
--  TABLE: bookings_spatial
-- =========================================
CREATE TABLE IF NOT EXISTS public.bookings_spatial (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_trip_id        uuid REFERENCES public.driver_trips_spatial(id) ON DELETE CASCADE,
  passenger_intent_id   uuid REFERENCES public.passenger_intents_spatial(id) ON DELETE CASCADE,
  fare_rwf              integer,
  status                text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled')),
  channel               text DEFAULT 'whatsapp',
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- =========================================
--  Row‑Level Security
-- =========================================
ALTER TABLE public.driver_trips_spatial      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passenger_intents_spatial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings_spatial          ENABLE ROW LEVEL SECURITY;

-- Driver trip policies
CREATE POLICY "drivers_can_manage_own_trips_spatial"
  ON public.driver_trips_spatial
  FOR ALL
  USING ( auth.uid() = driver_id );

CREATE POLICY "allow_public_read_active_trips_spatial"
  ON public.driver_trips_spatial
  FOR SELECT
  USING ( status = 'active' );

-- Passenger intent policies  
CREATE POLICY "passengers_can_manage_own_intents"
  ON public.passenger_intents_spatial
  FOR ALL
  USING ( 
    passenger_phone = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'phone',
      current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "allow_public_read_open_intents"
  ON public.passenger_intents_spatial
  FOR SELECT
  USING ( status = 'open' );

-- Booking policies
CREATE POLICY "users_can_view_own_bookings"
  ON public.bookings_spatial
  FOR SELECT
  USING ( 
    driver_trip_id IN (SELECT id FROM public.driver_trips_spatial WHERE driver_id = auth.uid())
    OR passenger_intent_id IN (
      SELECT id FROM public.passenger_intents_spatial 
      WHERE passenger_phone = COALESCE(
        current_setting('request.jwt.claims', true)::json->>'phone',
        current_setting('request.jwt.claims', true)::json->>'sub'
      )
    )
  );

-- =========================================
--  RPC: fn_get_nearby_drivers_spatial
--  returns trips within <radius_km>
-- =========================================
CREATE OR REPLACE FUNCTION public.fn_get_nearby_drivers_spatial(
  lat double precision,
  lng double precision,
  radius double precision DEFAULT 2
)
RETURNS TABLE (
  id            uuid,
  driver_id     uuid,
  driver_phone  text,
  price_rwf     integer,
  seats         integer,
  distance_km   double precision,
  origin_lat    double precision,
  origin_lng    double precision,
  destination_lat double precision,
  destination_lng double precision,
  from_text     text,
  to_text       text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN query
    SELECT
      dt.id,
      dt.driver_id,
      dt.driver_phone,
      dt.price_rwf,
      dt.seats,
      ROUND( ST_DistanceSphere( dt.origin, ST_MakePoint(lng,lat) ) / 1000.0, 2 )  as distance_km,
      ST_Y(dt.origin::geometry)       as origin_lat,
      ST_X(dt.origin::geometry)       as origin_lng,
      ST_Y(dt.destination::geometry)  as destination_lat,
      ST_X(dt.destination::geometry)  as destination_lng,
      dt.from_text,
      dt.to_text
    FROM public.driver_trips_spatial dt
    WHERE dt.status = 'active'
      AND ST_DWithin(
            dt.origin,
            ST_MakePoint(lng,lat)::geography,
            radius * 1000  -- metres
          )
    ORDER BY distance_km
    LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_nearby_drivers_spatial TO anon, authenticated;

-- =========================================
--  Trigger to auto‑update updated_at
-- =========================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER driver_trips_spatial_updated
  BEFORE UPDATE ON public.driver_trips_spatial
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER passenger_intents_spatial_updated
  BEFORE UPDATE ON public.passenger_intents_spatial
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER bookings_spatial_updated
  BEFORE UPDATE ON public.bookings_spatial
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- =========================================
--  Unified view for admin UI
-- =========================================
CREATE OR REPLACE VIEW trips_and_intents_spatial AS
SELECT  
  id,
  'driver_trip'::text      as type,
  COALESCE(driver_phone, driver_id::text) as user_phone,
  from_text, 
  to_text,
  price_rwf,
  seats,
  status,
  created_at, 
  updated_at
FROM driver_trips_spatial
UNION ALL
SELECT  
  id,
  'passenger_intent'::text as type,
  passenger_phone as user_phone,
  from_text, 
  to_text,
  max_price_rwf as price_rwf,
  seats_needed  as seats,
  status,
  created_at, 
  updated_at
FROM passenger_intents_spatial;