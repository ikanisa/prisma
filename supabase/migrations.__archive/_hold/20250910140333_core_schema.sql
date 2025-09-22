-- =========================================================
-- CORE EXTENSIONS
-- =========================================================
create extension if not exists pgcrypto; -- for gen_random_uuid()
create extension if not exists postgis;  -- geography(Point,4326)

-- =========================================================
-- ENUMS (mobility + baskets)
-- =========================================================
do $$ begin
  create type trip_role as enum ('driver','passenger');
exception when duplicate_object then null; end $$;

do $$ begin
  create type trip_status as enum ('open','matched','closed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type vehicle_type as enum ('moto','car','van','truck','bus','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type basket_type as enum ('public','private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type basket_status as enum ('draft','pending_review','approved','rejected','suspended','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_role as enum ('creator','member','watcher');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contribution_status as enum ('initiated','pending_creator_check','approved','not_received','expired','cancelled');
exception when duplicate_object then null; end $$;

-- =========================================================
-- PROFILES (canonical user)
-- =========================================================
create table if not exists public.profiles (
  user_id uuid primary key default gen_random_uuid(),
  whatsapp_e164 text unique not null,  -- e.g. +2507XXXXXXXX
  display_name text,
  locale text default 'rw',
  is_admin boolean default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- =========================================================
-- CHAT STATE (webhook finite state)
-- =========================================================
create table if not exists public.chat_state (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.chat_state enable row level security;

-- =========================================================
-- IDEMPOTENCY LEDGER (one row per WA message id)
-- =========================================================
create table if not exists public.wa_events (
  wamid text primary key,
  created_at timestamptz not null default now()
);
alter table public.wa_events enable row level security;

-- =========================================================
-- APP CONFIG (key/value; seed admin numbers)
-- =========================================================
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;

insert into public.app_config(key, value) values
  ('default', jsonb_build_object(
      'insurance_admin_numbers', jsonb_build_array('0250788767816','0250795588248'),
      'basket_admin_numbers',    jsonb_build_array('+250795588248')
  ))
on conflict (key) do update set value = excluded.value, updated_at = now();

-- =========================================================
-- MARKETPLACE CATEGORIES
-- =========================================================
create table if not exists public.marketplace_categories (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,          -- 'groceries', 'pharmacy', ...
  label text not null
);
alter table public.marketplace_categories enable row level security;

insert into public.marketplace_categories(code,label) values
  ('groceries','Groceries'),
  ('pharmacy','Pharmacy'),
  ('mechanic','Mechanic'),
  ('salon','Salon'),
  ('restaurant','Restaurant'),
  ('general','General')
on conflict (code) do update set label = excluded.label;

-- =========================================================
-- BUSINESSES (Marketplace)
-- =========================================================
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(user_id) on delete set null,
  name text not null,
  description text,
  category_code text references public.marketplace_categories(code) on delete set null,
  whatsapp_e164 text, -- optional public contact
  geo geography(Point,4326),  -- WhatsApp location
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_businesses_geo on public.businesses using gist(geo);
create index if not exists idx_businesses_active on public.businesses(is_active);
alter table public.businesses enable row level security;

-- =========================================================
-- DRIVER PRESENCE / STATUS
-- =========================================================
create table if not exists public.driver_status (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  location geography(Point,4326),
  last_seen timestamptz not null default now(),
  online boolean not null default true
);
create index if not exists idx_driver_status_loc on public.driver_status using gist(location);
alter table public.driver_status enable row level security;

-- =========================================================
-- TRIPS (passenger requests OR driver offers)
-- =========================================================
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references public.profiles(user_id) on delete cascade,
  role trip_role not null,               -- 'passenger' or 'driver'
  status trip_status not null default 'open',
  vehicle vehicle_type,                  -- user must pick one
  pickup geography(Point,4326),
  dropoff geography(Point,4326),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_trips_pickup on public.trips using gist(pickup);
create index if not exists idx_trips_role_status on public.trips(role,status,created_at desc);
alter table public.trips enable row level security;

-- =========================================================
-- SERVED (domain-specific; NEVER for businesses)
-- =========================================================
create table if not exists public.served_drivers (
  viewer_passenger_msisdn text not null,
  driver_contact_id uuid not null, -- equals profiles.user_id for driver
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (viewer_passenger_msisdn, driver_contact_id)
);
alter table public.served_drivers enable row level security;

create table if not exists public.served_passengers (
  viewer_driver_msisdn text not null,
  passenger_trip_id uuid not null references public.trips(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (viewer_driver_msisdn, passenger_trip_id)
);
alter table public.served_passengers enable row level security;

-- =========================================================
-- INSURANCE (lead + media)
-- =========================================================
create table if not exists public.insurance_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(user_id) on delete set null,
  status text not null default 'new', -- 'new','processing','quoted','completed','rejected'
  extracted jsonb default '{}'::jsonb,   -- merged summary from OCR
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.insurance_leads enable row level security;

create table if not exists public.insurance_media (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.insurance_leads(id) on delete cascade,
  wa_media_id text unique,           -- to dedupe WA downloads
  storage_path text not null,        -- path in Storage bucket
  mime text,
  bytes integer,
  extracted jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.insurance_media enable row level security;

-- =========================================================
-- BASKETS (community funds)
-- =========================================================
create table if not exists public.baskets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  momo_number text,                  -- 07XXXXXXXX
  momo_code text,                    -- 4–9 digits
  type basket_type not null,
  status basket_status not null default 'draft',
  currency text not null default 'RWF',
  creator_id uuid references public.profiles(user_id) on delete restrict,
  public_slug text unique,
  created_at timestamptz default now(),
  approved_at timestamptz,
  closed_at timestamptz
);
alter table public.baskets enable row level security;

create table if not exists public.basket_members (
  basket_id uuid references public.baskets(id) on delete cascade,
  user_id uuid references public.profiles(user_id) on delete cascade,
  role member_role not null default 'member',
  added_by uuid references public.profiles(user_id),
  created_at timestamptz default now(),
  primary key (basket_id, user_id, role)
);
alter table public.basket_members enable row level security;

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  basket_id uuid references public.baskets(id) on delete cascade,
  contributor_id uuid references public.profiles(user_id) on delete set null,
  amount numeric(14,2) not null,
  currency text not null default 'RWF',
  status contribution_status not null default 'initiated',
  ussd_session_ref text,
  note text,
  approved_by uuid references public.profiles(user_id),
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_contrib_basket_status on public.contributions(basket_id,status,created_at desc);
alter table public.contributions enable row level security;

create table if not exists public.contribution_events (
  id bigserial primary key,
  contribution_id uuid references public.contributions(id) on delete cascade,
  event text not null,   -- 'I_SENT','APPROVED','NOT_RECEIVED','EXPIRED'
  actor uuid references public.profiles(user_id),
  meta jsonb,
  created_at timestamptz default now()
);
alter table public.contribution_events enable row level security;

create table if not exists public.admin_actions (
  id bigserial primary key,
  admin_id uuid references public.profiles(user_id),
  basket_id uuid references public.baskets(id),
  action text not null,  -- 'APPROVE_PUBLIC','REJECT','SUSPEND','MESSAGE_CREATOR'
  reason text,
  created_at timestamptz default now()
);
alter table public.admin_actions enable row level security;

create table if not exists public.shortlinks (
  slug text primary key,           -- e.g., 'BK-3F9G'
  basket_id uuid references public.baskets(id) on delete cascade,
  is_private boolean default false,
  created_at timestamptz default now()
);
alter table public.shortlinks enable row level security;

-- =========================================================
-- FUNCTIONS (RPC) — distance in KM; NO 'served' on businesses
-- =========================================================

-- Nearby businesses (always visible; ranked by distance)
create or replace function public.nearby_businesses(
  _lat double precision,
  _lon double precision,
  _viewer text,
  _limit int
)
returns table(id uuid, name text, description text, distance_km numeric)
language sql stable as $$
  select
    b.id,
    b.name,
    coalesce(b.description,'') as description,
    ST_Distance(
      b.geo,
      ST_SetSRID(ST_Point(_lon,_lat),4326)::geography
    )/1000.0 as distance_km
  from public.businesses b
  where b.is_active = true
    and b.geo is not null
  order by distance_km nulls last, b.created_at desc
  limit _limit;
$$;

-- Nearby drivers (exclude already served to this passenger)
create or replace function public.nearby_drivers(
  _lat double precision,
  _lon double precision,
  _viewer text,
  _limit int
)
returns table(driver_user_id uuid, whatsapp_e164 text, distance_km numeric, last_seen timestamptz)
language sql stable as $$
  select
    d.user_id as driver_user_id,
    p.whatsapp_e164,
    ST_Distance(
      d.location,
      ST_SetSRID(ST_Point(_lon,_lat),4326)::geography
    )/1000.0 as distance_km,
    d.last_seen
  from public.driver_status d
  join public.profiles p on p.user_id = d.user_id
  where d.online = true
    and d.location is not null
    and not exists (
      select 1
      from public.served_drivers sd
      where sd.viewer_passenger_msisdn = _viewer
        and sd.driver_contact_id = d.user_id
        and sd.expires_at > now()
    )
  order by distance_km nulls last, d.last_seen desc
  limit _limit;
$$;

-- Nearby passengers (exclude already served to this driver)
create or replace function public.nearby_passengers(
  _lat double precision,
  _lon double precision,
  _viewer text,
  _limit int
)
returns table(trip_id uuid, creator_user_id uuid, whatsapp_e164 text, distance_km numeric, created_at timestamptz)
language sql stable as $$
  select
    t.id as trip_id,
    t.creator_user_id,
    p.whatsapp_e164,
    ST_Distance(
      t.pickup,
      ST_SetSRID(ST_Point(_lon,_lat),4326)::geography
    )/1000.0 as distance_km,
    t.created_at
  from public.trips t
  join public.profiles p on p.user_id = t.creator_user_id
  where t.role = 'passenger'
    and t.status = 'open'
    and t.pickup is not null
    and not exists (
      select 1
      from public.served_passengers sp
      where sp.viewer_driver_msisdn = _viewer
        and sp.passenger_trip_id = t.id
        and sp.expires_at > now()
    )
  order by distance_km nulls last, t.created_at desc
  limit _limit;
$$;

-- Mark served (domain specific)
create or replace function public.mark_served(
  _viewer text,
  _kind text,
  _target_uuid uuid
) returns void
language plpgsql as $$
begin
  if _kind = 'driver' then
    insert into public.served_drivers(viewer_passenger_msisdn, driver_contact_id, expires_at)
    values (_viewer, _target_uuid, now() + interval '15 minutes')
    on conflict (viewer_passenger_msisdn, driver_contact_id)
    do update set expires_at = excluded.expires_at, created_at = now();

  elsif _kind = 'passenger' then
    insert into public.served_passengers(viewer_driver_msisdn, passenger_trip_id, expires_at)
    values (_viewer, _target_uuid, now() + interval '15 minutes')
    on conflict (viewer_driver_msisdn, passenger_trip_id)
    do update set expires_at = excluded.expires_at, created_at = now();

  else
    -- businesses are never marked served
    perform 1;
  end if;
end;
$$;

-- =========================================================
-- RLS: keep enabled (service role bypasses). Minimal safe defaults.
-- =========================================================
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles') then
    create policy no_public_profiles on public.profiles for all using (false);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='chat_state') then
    create policy no_public_chat_state on public.chat_state for all using (false);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='wa_events') then
    create policy no_public_wa_events on public.wa_events for all using (false);
  end if;
end $$;

-- Repeat deny-all for other tables (Edge Functions use service role and bypass RLS)
do $$ begin
  perform 1;
  -- Businesses
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='businesses') then
    create policy no_public_businesses on public.businesses for all using (false);
  end if;
  -- driver_status
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='driver_status') then
    create policy no_public_driver_status on public.driver_status for all using (false);
  end if;
  -- trips
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trips') then
    create policy no_public_trips on public.trips for all using (false);
  end if;
  -- served tables
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='served_drivers') then
    create policy no_public_served_drivers on public.served_drivers for all using (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='served_passengers') then
    create policy no_public_served_passengers on public.served_passengers for all using (false);
  end if;
  -- insurance
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='insurance_leads') then
    create policy no_public_insurance_leads on public.insurance_leads for all using (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='insurance_media') then
    create policy no_public_insurance_media on public.insurance_media for all using (false);
  end if;
  -- baskets
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='baskets') then
    create policy no_public_baskets on public.baskets for all using (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='basket_members') then
    create policy no_public_basket_members on public.basket_members for all using (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='contributions') then
    create policy no_public_contributions on public.contributions for all using (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='contribution_events') then
    create policy no_public_contribution_events on public.contribution_events for all using (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='admin_actions') then
    create policy no_public_admin_actions on public.admin_actions for all using (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='shortlinks') then
    create policy no_public_shortlinks on public.shortlinks for all using (false);
  end if;
  -- categories & app_config
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='marketplace_categories') then
    create policy no_public_marketplace_categories on public.marketplace_categories for all using (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='app_config') then
    create policy no_public_app_config on public.app_config for all using (false);
  end if;
end $$;

-- =========================================================
-- LIGHT SANITY GUARD
-- =========================================================
create or replace function public.assert_schema()
returns void language plpgsql as $$
begin
  -- Make sure businesses.id is uuid and there is NO "served" dependency in nearby_businesses
  perform 1 from information_schema.columns
   where table_schema='public' and table_name='businesses'
     and column_name='id' and data_type='uuid';
  if not found then raise exception 'Schema mismatch: businesses.id must be uuid'; end if;

  -- Ensure geography indexes exist
  perform 1 from pg_indexes where tablename='businesses' and indexname='idx_businesses_geo';
  if not found then raise exception 'Missing GIST index on businesses.geo'; end if;
end;
$$;
