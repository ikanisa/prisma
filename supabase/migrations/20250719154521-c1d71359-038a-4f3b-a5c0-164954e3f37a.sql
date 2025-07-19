-- ==========================================
-- RIDE VERTICAL SCHEMA
-- ==========================================

-- Enums for ride system
CREATE TYPE trip_status AS ENUM ('draft','open','booked','in_progress','completed','cancelled');
CREATE TYPE booking_state AS ENUM ('pending','confirmed','rejected','cancelled','done');

-- Drivers advertise where they're willing to go
CREATE TABLE trips (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id       uuid REFERENCES drivers(id) ON DELETE CASCADE,
  pickup_point    geography(Point,4326),     -- driver‑defined cluster start
  dropoff_point   geography(Point,4326),     -- optional route anchor
  price_estimate  int NOT NULL,
  seats_available smallint DEFAULT 1,
  departs_at      timestamptz,
  status          trip_status DEFAULT 'open',
  created_at      timestamptz DEFAULT now()
);

-- Passengers publish what they need
CREATE TABLE ride_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id  uuid REFERENCES users(id),
  pickup_point  geography(Point,4326),
  dropoff_point geography(Point,4326),
  desired_time  timestamptz,
  max_budget    int,
  seats_needed  smallint DEFAULT 1,
  created_at    timestamptz DEFAULT now()
);

-- A booking links one request to one trip
CREATE TABLE ride_bookings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id        uuid REFERENCES trips(id),
  request_id     uuid REFERENCES ride_requests(id),
  passenger_id   uuid REFERENCES users(id),
  driver_id      uuid REFERENCES drivers(id),
  state          booking_state DEFAULT 'pending',
  agreed_price   int,
  confirmed_at   timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz DEFAULT now()
);

-- Indexes for geo search
CREATE INDEX trips_pickup_idx ON trips USING gist (pickup_point);
CREATE INDEX requests_pickup_idx ON ride_requests USING gist (pickup_point);

-- ==========================================
-- MARKETING DRIP SCHEMA
-- ==========================================

-- Campaign master
CREATE TABLE marketing_campaigns (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid REFERENCES businesses(id),     -- NULL = global
  name          text NOT NULL,
  description   text,
  owner_id      uuid REFERENCES users(id),
  status        text DEFAULT 'draft',               -- draft|scheduled|running|paused|completed
  start_at      timestamptz,
  interval_min  int DEFAULT 360,                   -- every 6 h by default
  template_text text,                              -- simplified template
  max_sends     int DEFAULT 6,                     -- e.g. 3‑day sequence
  created_at    timestamptz DEFAULT now()
);

-- Dynamic segment definition
CREATE TABLE campaign_segments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  name          text,
  description   text,
  segment_sql   text,                   -- returns wa_id,text_lang,opt_out
  last_count    int,
  updated_at    timestamptz DEFAULT now()
);

-- Each subscriber's state inside a campaign
CREATE TABLE campaign_subscribers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  wa_id         text,
  lang          text DEFAULT 'en',
  send_count    int DEFAULT 0,
  last_sent_at  timestamptz,
  status        text DEFAULT 'active'   -- active|opted_out|completed
);

CREATE INDEX sub_campaign_idx ON campaign_subscribers(campaign_id);
CREATE INDEX sub_wa_idx ON campaign_subscribers(wa_id);

-- Outbound + inbound events for analytics
CREATE TYPE evt AS ENUM ('sent','delivered','read','clicked','opt_out');
CREATE TABLE subscriber_events (
  id              bigserial PRIMARY KEY,
  subscriber_id   uuid REFERENCES campaign_subscribers(id) ON DELETE CASCADE,
  event           evt,
  meta            jsonb,
  created_at      timestamptz DEFAULT now()
);

-- Central opt‑out registry
CREATE TABLE opt_outs (
  wa_id         text PRIMARY KEY,
  channel       text DEFAULT 'whatsapp',
  reason        text,
  created_at    timestamptz DEFAULT now()
);

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Trips RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can manage their trips" ON trips
  FOR ALL USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "Public can view open trips" ON trips
  FOR SELECT USING (status = 'open');

CREATE POLICY "System can manage trips" ON trips
  FOR ALL USING (true);

-- Ride Requests RLS  
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Passengers can manage their requests" ON ride_requests
  FOR ALL USING (passenger_id = auth.uid());

CREATE POLICY "Drivers can view requests" ON ride_requests
  FOR SELECT USING (true);

CREATE POLICY "System can manage requests" ON ride_requests
  FOR ALL USING (true);

-- Ride Bookings RLS
ALTER TABLE ride_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Passengers can view their bookings" ON ride_bookings
  FOR SELECT USING (passenger_id = auth.uid());

CREATE POLICY "Drivers can view their bookings" ON ride_bookings
  FOR SELECT USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "System can manage bookings" ON ride_bookings
  FOR ALL USING (true);

-- Marketing Campaigns RLS
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage campaigns" ON marketing_campaigns
  FOR ALL USING (is_admin());

-- Campaign Segments RLS
ALTER TABLE campaign_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage segments" ON campaign_segments
  FOR ALL USING (is_admin());

-- Campaign Subscribers RLS
ALTER TABLE campaign_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view subscribers" ON campaign_subscribers
  FOR SELECT USING (is_admin());

CREATE POLICY "System can manage subscribers" ON campaign_subscribers
  FOR ALL USING (true);

-- Subscriber Events RLS
ALTER TABLE subscriber_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view events" ON subscriber_events
  FOR SELECT USING (is_admin());

CREATE POLICY "System can manage events" ON subscriber_events
  FOR ALL USING (true);

-- Opt Outs RLS
ALTER TABLE opt_outs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view opt outs" ON opt_outs
  FOR SELECT USING (is_admin());

CREATE POLICY "System can manage opt outs" ON opt_outs
  FOR ALL USING (true);