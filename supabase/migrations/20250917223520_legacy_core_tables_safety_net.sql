-- Safe legacy core tables (idempotent) — NO basket drops/changes.
-- This file only creates objects if they don't exist, to satisfy the webhook.

-- 0) Extensions we rely on
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Event idempotency store (used by webhook to dedupe WA messages)
CREATE TABLE IF NOT EXISTS public.wa_events (
  wa_message_id text PRIMARY KEY,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 2) Chat state store (user_id should be UUID because profiles.user_id is UUID)
CREATE TABLE IF NOT EXISTS public.chat_state (
  user_id   uuid PRIMARY KEY,
  state     jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz
);

-- 3) Contacts (STOP/START + last inbound attrs)
CREATE TABLE IF NOT EXISTS public.contacts (
  msisdn_e164  text PRIMARY KEY,
  opted_out    boolean NOT NULL DEFAULT false,
  opted_in     boolean NOT NULL DEFAULT false,
  attributes   jsonb    NOT NULL DEFAULT '{}'::jsonb,
  opt_in_ts    timestamptz,
  opt_out_ts   timestamptz
);

-- 4) MoMo QR logs (used by generateAndSendMomoQR in the webhook)
CREATE TABLE IF NOT EXISTS public.momo_qr_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid    NOT NULL,
  whatsapp_e164   text    NOT NULL,
  kind            text    NOT NULL CHECK (kind IN ('number','code')),
  momo_value      text    NOT NULL,
  amount_rwf      integer NULL,
  ussd_text       text    NOT NULL,
  tel_uri         text    NOT NULL,
  qr_url          text    NOT NULL,
  share_url       text    NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 5) Served (throttle repeat-serving the same contact lists)
CREATE TABLE IF NOT EXISTS public.served_drivers (
  id                        bigserial PRIMARY KEY,
  viewer_passenger_msisdn   text        NOT NULL,
  driver_contact_id         text        NOT NULL,
  expires_at                timestamptz NOT NULL,
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.served_passengers (
  id                      bigserial PRIMARY KEY,
  viewer_driver_msisdn    text        NOT NULL,
  passenger_trip_id       uuid        NOT NULL,
  expires_at              timestamptz NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- NOTE:
-- We intentionally DO NOT touch any basket tables, triggers, or views.
-- We also do not modify nearby_* or match_* RPCs (they’re already present).
