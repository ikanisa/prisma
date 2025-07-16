-- Enable PostGIS extension for geography support
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
--  ENUM TYPES
-- ============================================================
CREATE TYPE business_type  AS ENUM ('bar','pharmacy','shop');
CREATE TYPE driver_type    AS ENUM ('moto','cab','truck');
CREATE TYPE order_status   AS ENUM ('pending','paid','preparing','delivering','fulfilled','cancelled');
CREATE TYPE trip_status    AS ENUM ('scheduled','ongoing','completed','cancelled');
CREATE TYPE payment_status AS ENUM ('pending','paid','failed');

-- ============================================================
--  USERS  &  REFERRALS
-- ============================================================
CREATE TABLE public.users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone          text UNIQUE NOT NULL,
  momo_code      text,
  credits        int  NOT NULL DEFAULT 60,
  referral_code  text UNIQUE,
  referred_by    text,
  created_at     timestamp DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.gen_ref_code() RETURNS trigger AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := encode(gen_random_bytes(3),'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gen_ref
BEFORE INSERT ON public.users
FOR EACH ROW EXECUTE PROCEDURE public.gen_ref_code();

CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid REFERENCES public.users(id),
  referred_user_id uuid REFERENCES public.users(id),
  created_at timestamp DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.add_ref_credit() RETURNS trigger AS $$
BEGIN
  UPDATE public.users SET credits = credits + 1
  WHERE id = NEW.referrer_user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_add_ref_credit
AFTER INSERT ON public.referrals
FOR EACH ROW EXECUTE PROCEDURE public.add_ref_credit();

-- ============================================================
--  BUSINESSES  &  DRIVERS
-- ============================================================
CREATE TABLE public.businesses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id    uuid REFERENCES public.users(id),
  name             text NOT NULL,
  momo_code        text NOT NULL,
  location_gps     geography(point,4326),
  category         business_type,
  subscription_status text DEFAULT 'trial',
  created_at       timestamp DEFAULT now()
);

CREATE TABLE public.drivers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES public.users(id),
  driver_kind      driver_type,
  vehicle_plate    text,
  momo_code        text NOT NULL,
  logbook_url      text,
  location_gps     geography(point,4326),
  is_online        boolean DEFAULT false,
  subscription_status text DEFAULT 'trial',
  created_at       timestamp DEFAULT now()
);

CREATE TABLE public.driver_wallet (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES public.drivers(id),
  balance   int DEFAULT 0
);

-- ============================================================
--  PRODUCTS  (FARMER INVENTORY)
-- ============================================================
CREATE TABLE public.products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id   uuid REFERENCES public.users(id),
  name        text,
  unit        text,
  price       int,
  stock       int,
  image_url   text,
  created_at  timestamp DEFAULT now()
);

-- ============================================================
--  PAYMENTS
-- ============================================================
CREATE TABLE public.payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.users(id),
  momo_code   text NOT NULL,
  amount      int  NOT NULL,
  ussd_code   text NOT NULL,
  qr_code_url text,
  ussd_link   text,
  status      payment_status DEFAULT 'pending',
  created_at  timestamp DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.deduct_credit() RETURNS trigger AS $$
BEGIN
  UPDATE public.users SET credits = credits - 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deduct_credit
AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE PROCEDURE public.deduct_credit();

-- ============================================================
--  ORDERS
-- ============================================================
CREATE TABLE public.orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES public.users(id),
  business_id   uuid REFERENCES public.businesses(id),
  farmer_id     uuid REFERENCES public.users(id),
  driver_id     uuid REFERENCES public.drivers(id),
  items         jsonb,
  delivery      boolean DEFAULT false,
  delivery_fee  int     DEFAULT 0,
  total_price   int,
  status        order_status DEFAULT 'pending',
  payment_id    uuid REFERENCES public.payments(id),
  created_at    timestamp DEFAULT now()
);

-- ============================================================
--  TRIPS  &  BOOKINGS
-- ============================================================
CREATE TABLE public.trips (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id        uuid REFERENCES public.drivers(id),
  pickup_location  text,
  dropoff_location text,
  departure_time   timestamp,
  status           trip_status DEFAULT 'scheduled',
  created_at       timestamp DEFAULT now()
);

CREATE TABLE public.bookings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      uuid REFERENCES public.trips(id),
  passenger_id uuid REFERENCES public.users(id),
  status       text DEFAULT 'pending',
  created_at   timestamp DEFAULT now()
);

-- ============================================================
--  EVENTS
-- ============================================================
CREATE TABLE public.events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text,
  description       text,
  location          text,
  gps_location      geography(point,4326),
  event_date        timestamp,
  organizer_user_id uuid REFERENCES public.users(id),
  price             int,
  category          text,
  image_url         text,
  external_source   text,
  created_at        timestamp DEFAULT now()
);

-- ============================================================
--  CONTACT LEADS  &  CRAWLED BIZ
-- ============================================================
CREATE TABLE public.user_contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text,
  phone         text UNIQUE,
  source        text,
  business_name text,
  location      text,
  category      text,
  created_at    timestamp DEFAULT now()
);

CREATE TABLE public.google_places_businesses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id        text UNIQUE,
  name            text,
  location_gps    geography(point,4326),
  google_maps_url text,
  category        text,
  country         text,
  region          text,
  momo_code       text,
  agent_verified  boolean DEFAULT false,
  created_at      timestamp DEFAULT now()
);

-- ============================================================
--  AI CONVOS  &  SUPPORT
-- ============================================================
CREATE TABLE public.agent_conversations (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  uuid REFERENCES public.users(id),
  role     text,
  message  text,
  ts       timestamp DEFAULT now()
);

CREATE TABLE public.support_tickets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES public.users(id),
  topic      text,
  status     text DEFAULT 'open',
  created_at timestamp DEFAULT now()
);

-- ============================================================
--  SUBSCRIPTIONS
-- ============================================================
CREATE TABLE public.subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES public.users(id),
  sub_type   text,
  amount     int,
  start_date date,
  end_date   date,
  status     text DEFAULT 'active'
);

-- ============================================================
--  INDEXES (GEO & SEARCH)
-- ============================================================
CREATE INDEX idx_products_name ON public.products
  USING gin (to_tsvector('simple', name));

CREATE INDEX idx_businesses_geo ON public.businesses USING gist (location_gps);
CREATE INDEX idx_drivers_geo   ON public.drivers   USING gist (location_gps);

-- ============================================================
--  ROW‑LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events         ENABLE ROW LEVEL SECURITY;

-- == users ==
CREATE POLICY "Self access" ON public.users
  FOR SELECT USING (id = auth.uid()::uuid);

CREATE POLICY "Self update" ON public.users
  FOR UPDATE USING (id = auth.uid()::uuid) 
  WITH CHECK (id = auth.uid()::uuid);

CREATE POLICY "Self insert" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid()::uuid);

-- == payments ==
CREATE POLICY "User payments select" ON public.payments
  FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "User payments insert" ON public.payments
  FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);

-- == orders ==
CREATE POLICY "User orders select" ON public.orders
  FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "User orders insert" ON public.orders
  FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);

-- == products ==
CREATE POLICY "Farmer products" ON public.products
  FOR ALL USING (farmer_id = auth.uid()::uuid)
  WITH CHECK (farmer_id = auth.uid()::uuid);

-- == drivers ==
CREATE POLICY "Driver row" ON public.drivers
  FOR ALL USING (user_id = auth.uid()::uuid)
  WITH CHECK (user_id = auth.uid()::uuid);

-- == businesses ==
CREATE POLICY "Business owner" ON public.businesses
  FOR ALL USING (owner_user_id = auth.uid()::uuid)
  WITH CHECK (owner_user_id = auth.uid()::uuid);

-- == trips ==
CREATE POLICY "Driver trips" ON public.trips
  FOR ALL USING (
    driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()::uuid
    )
  );

-- == bookings ==
CREATE POLICY "Passenger bookings" ON public.bookings
  FOR ALL USING (passenger_id = auth.uid()::uuid)
  WITH CHECK (passenger_id = auth.uid()::uuid);

-- == events ==
CREATE POLICY "Public events" ON public.events
  FOR SELECT USING (true);

CREATE POLICY "Organizer events" ON public.events
  FOR ALL USING (organizer_user_id = auth.uid()::uuid)
  WITH CHECK (organizer_user_id = auth.uid()::uuid);

-- Create missing trigger for stock decrement (will be added when order_lines table is created)
CREATE OR REPLACE FUNCTION public.decrement_stock() RETURNS trigger AS $$
BEGIN
  UPDATE public.products SET stock = stock - NEW.quantity
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;