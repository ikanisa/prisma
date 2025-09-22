-- ==========================================
-- MISSING RIDE VERTICAL TABLES
-- ==========================================

-- Check if booking_state enum exists, create if not
DO $$ BEGIN
    CREATE TYPE booking_state AS ENUM ('pending','confirmed','rejected','cancelled','done');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- A booking links one request to one trip
CREATE TABLE IF NOT EXISTS ride_bookings (
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

-- ==========================================
-- MARKETING DRIP SCHEMA
-- ==========================================

-- Campaign master
CREATE TABLE IF NOT EXISTS marketing_campaigns (
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
CREATE TABLE IF NOT EXISTS campaign_segments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  name          text,
  description   text,
  segment_sql   text,                   -- returns wa_id,text_lang,opt_out
  last_count    int,
  updated_at    timestamptz DEFAULT now()
);

-- Each subscriber's state inside a campaign
CREATE TABLE IF NOT EXISTS campaign_subscribers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  wa_id         text,
  lang          text DEFAULT 'en',
  send_count    int DEFAULT 0,
  last_sent_at  timestamptz,
  status        text DEFAULT 'active'   -- active|opted_out|completed
);

-- Outbound + inbound events for analytics
DO $$ BEGIN
    CREATE TYPE evt AS ENUM ('sent','delivered','read','clicked','opt_out');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS subscriber_events (
  id              bigserial PRIMARY KEY,
  subscriber_id   uuid REFERENCES campaign_subscribers(id) ON DELETE CASCADE,
  event           evt,
  meta            jsonb,
  created_at      timestamptz DEFAULT now()
);

-- Central opt‑out registry
CREATE TABLE IF NOT EXISTS opt_outs (
  wa_id         text PRIMARY KEY,
  channel       text DEFAULT 'whatsapp',
  reason        text,
  created_at    timestamptz DEFAULT now()
);

-- ==========================================
-- INDEXES (only if tables were created)
-- ==========================================

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS sub_campaign_idx ON campaign_subscribers(campaign_id);
CREATE INDEX IF NOT EXISTS sub_wa_idx ON campaign_subscribers(wa_id);

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Ride Bookings RLS
ALTER TABLE ride_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Passengers can view their bookings" ON ride_bookings;
CREATE POLICY "Passengers can view their bookings" ON ride_bookings
  FOR SELECT USING (passenger_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can view their bookings" ON ride_bookings;
CREATE POLICY "Drivers can view their bookings" ON ride_bookings
  FOR SELECT USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "System can manage bookings" ON ride_bookings;
CREATE POLICY "System can manage bookings" ON ride_bookings
  FOR ALL USING (true);

-- Marketing Campaigns RLS
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage campaigns" ON marketing_campaigns;
CREATE POLICY "Admin can manage campaigns" ON marketing_campaigns
  FOR ALL USING (is_admin());

-- Campaign Segments RLS
ALTER TABLE campaign_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage segments" ON campaign_segments;
CREATE POLICY "Admin can manage segments" ON campaign_segments
  FOR ALL USING (is_admin());

-- Campaign Subscribers RLS
ALTER TABLE campaign_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view subscribers" ON campaign_subscribers;
CREATE POLICY "Admin can view subscribers" ON campaign_subscribers
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "System can manage subscribers" ON campaign_subscribers;
CREATE POLICY "System can manage subscribers" ON campaign_subscribers
  FOR ALL USING (true);

-- Subscriber Events RLS
ALTER TABLE subscriber_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view events" ON subscriber_events;
CREATE POLICY "Admin can view events" ON subscriber_events
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "System can manage events" ON subscriber_events;
CREATE POLICY "System can manage events" ON subscriber_events
  FOR ALL USING (true);

-- Opt Outs RLS
ALTER TABLE opt_outs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view opt outs" ON opt_outs;
CREATE POLICY "Admin can view opt outs" ON opt_outs
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "System can manage opt outs" ON opt_outs;
CREATE POLICY "System can manage opt outs" ON opt_outs
  FOR ALL USING (true);