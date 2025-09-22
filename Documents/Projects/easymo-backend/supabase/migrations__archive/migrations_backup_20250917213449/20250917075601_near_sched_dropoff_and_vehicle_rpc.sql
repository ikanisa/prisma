-- ============================================================
-- Additive migration: drop-off support + vehicle-aware nearby/match
-- Safe to re-run: uses IF NOT EXISTS and CREATE OR REPLACE
-- ============================================================

begin;

-- 1) Extensions required
create extension if not exists postgis;
create extension if not exists pgcrypto; -- for gen_random_uuid()

-- 2) Tables & columns (additive)

-- trips: optional dropoff point
alter table if exists public.trips
  add column if not exists dropoff geometry(Point,4326);

-- helpful spatial indexes (idempotent create)
do $$
begin
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='trips_pickup_gix') then
    execute 'create index trips_pickup_gix on public.trips using gist (pickup);';
  end if;
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='trips_dropoff_gix') then
    execute 'create index trips_dropoff_gix on public.trips using gist (dropoff);';
  end if;
end$$;

-- profiles: store a preferred vehicle type
alter table if exists public.profiles
  add column if not exists vehicle_type text;

-- app_config: slot for bot number (for future deeplinks)
alter table if exists public.app_config
  add column if not exists wa_bot_number_e164 text;

-- idempotency table (used by webhook)
create table if not exists public.wa_events (
  wa_message_id text primary key,
  created_at timestamptz not null default now()
);
create unique index if not exists wa_events_wa_message_id_key
  on public.wa_events(wa_message_id);

-- MoMo QR requests log (used by webhook)
create table if not exists public.momo_qr_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  whatsapp_e164 text,
  kind text check (kind in ('number','code')),
  momo_value text,
  amount_rwf integer,
  ussd_text text,
  tel_uri text,
  qr_url text,
  share_url text,
  created_at timestamptz not null default now()
);

-- served caches (soft TTL)
create table if not exists public.served_drivers (
  id bigserial primary key,
  viewer_passenger_msisdn text,
  driver_contact_id text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists served_drivers_expires_at_idx on public.served_drivers(expires_at);

create table if not exists public.served_passengers (
  id bigserial primary key,
  viewer_driver_msisdn text,
  passenger_trip_id text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists served_passengers_expires_at_idx on public.served_passengers(expires_at);

-- 3) Vehicle-aware nearby wrappers (call your existing nearby_* and filter)

-- nearby_drivers_by_vehicle:
--  - wraps existing nearby_drivers(_lat,_lon,_viewer,_limit)
--  - filters by profiles.vehicle_type (case-insensitive)
drop function if exists public.nearby_drivers_by_vehicle(double precision,double precision,text,text,integer);
create or replace function public.nearby_drivers_by_vehicle(
  _lat double precision,
  _lon double precision,
  _viewer text,
  _vehicle text,
  _limit integer default 10
)
returns table (
  driver_user_id text,
  whatsapp_e164 text,
  distance_km double precision,
  last_seen timestamptz
)
language sql
stable
as $fn$
  select
    d.driver_user_id::text,
    d.whatsapp_e164,
    d.distance_km,
    d.last_seen
  from public.nearby_drivers(_lat, _lon, _viewer, greatest(10, _limit*5)) as d
  join public.profiles p
    on p.user_id::text = d.driver_user_id::text
  where coalesce(lower(p.vehicle_type),'') = lower(coalesce(_vehicle,''))
  order by d.distance_km asc
  limit _limit
$fn$;

-- nearby_passengers_by_vehicle:
--  - wraps existing nearby_passengers(_lat,_lon,_viewer,_limit)
--  - filters by trips.vehicle_type (case-insensitive)
drop function if exists public.nearby_passengers_by_vehicle(double precision,double precision,text,text,integer);
create or replace function public.nearby_passengers_by_vehicle(
  _lat double precision,
  _lon double precision,
  _viewer text,
  _vehicle text,
  _limit integer default 10
)
returns table (
  trip_id text,
  creator_user_id text,
  whatsapp_e164 text,
  distance_km double precision,
  created_at timestamptz
)
language sql
stable
as $fn$
  with np as (
    select * from public.nearby_passengers(_lat, _lon, _viewer, greatest(10, _limit*5))
  )
  select
    np.trip_id::text,
    np.creator_user_id::text,
    np.whatsapp_e164,
    np.distance_km,
    np.created_at
  from np
  join public.trips t
    on t.id::text = np.trip_id::text
  where coalesce(lower(t.vehicle_type),'') = lower(coalesce(_vehicle,''))
  order by np.distance_km asc
  limit _limit
$fn$;

-- 4) Matching with optional drop-off preference
--    We keep function names but add a DEFAULTed 3rd arg, so old calls still work.

-- match_drivers_for_trip: for a passenger trip -> find nearby drivers;
-- if given trip is driver, we still return "the other side" to be robust.
drop function if exists public.match_drivers_for_trip(uuid, integer);
drop function if exists public.match_drivers_for_trip(uuid, integer, boolean);
create or replace function public.match_drivers_for_trip(
  _trip_id uuid,
  _limit integer default 10,
  _prefer_dropoff boolean default false
)
returns table (
  trip_id text,
  creator_user_id text,
  distance_km double precision,
  created_at timestamptz
)
language plpgsql
stable
as $fn$
declare
  base_role text;
  base_vehicle text;
  base_pick geometry(Point,4326);
  base_drop geometry(Point,4326);
begin
  -- look up the source trip
  select role, vehicle_type, pickup, dropoff
    into base_role, base_vehicle, base_pick, base_drop
  from public.trips
  where id = _trip_id;

  if base_role is null then
    return; -- nothing
  end if;

  if base_role = 'passenger' then
    -- find DRIVERS matching a passenger trip
    return query
    select
      t.id::text,
      t.creator_user_id::text,
      ST_DistanceSphere(t.pickup, base_pick)/1000.0 as distance_km,
      t.created_at
    from public.trips t
    where t.status = 'open'
      and t.role = 'driver'
      and coalesce(lower(t.vehicle_type),'') = coalesce(lower(base_vehicle),'')
    order by
      ST_DistanceSphere(t.pickup, base_pick) +
      case
        when _prefer_dropoff and base_drop is not null and t.dropoff is not null
          then least(5000.0, ST_DistanceSphere(t.dropoff, base_drop)) * 0.5
        else 0
      end
    limit _limit;
  else
    -- if the input trip is a driver, we still return "driver-side list" for compatibility,
    -- but it will essentially be "nearby drivers to this driver" which is harmless.
    return query
    select
      t.id::text,
      t.creator_user_id::text,
      ST_DistanceSphere(t.pickup, base_pick)/1000.0 as distance_km,
      t.created_at
    from public.trips t
    where t.status = 'open'
      and t.role = 'driver'
      and coalesce(lower(t.vehicle_type),'') = coalesce(lower(base_vehicle),'')
    order by
      ST_DistanceSphere(t.pickup, base_pick) +
      case
        when _prefer_dropoff and base_drop is not null and t.dropoff is not null
          then least(5000.0, ST_DistanceSphere(t.dropoff, base_drop)) * 0.5
        else 0
      end
    limit _limit;
  end if;
end
$fn$;

-- match_passengers_for_trip: for a driver trip -> find passengers;
-- if given trip is passenger, returns passenger-side to be consistent.
drop function if exists public.match_passengers_for_trip(uuid, integer);
drop function if exists public.match_passengers_for_trip(uuid, integer, boolean);
create or replace function public.match_passengers_for_trip(
  _trip_id uuid,
  _limit integer default 10,
  _prefer_dropoff boolean default false
)
returns table (
  trip_id text,
  creator_user_id text,
  distance_km double precision,
  created_at timestamptz
)
language plpgsql
stable
as $fn$
declare
  base_role text;
  base_vehicle text;
  base_pick geometry(Point,4326);
  base_drop geometry(Point,4326);
begin
  select role, vehicle_type, pickup, dropoff
    into base_role, base_vehicle, base_pick, base_drop
  from public.trips
  where id = _trip_id;

  if base_role is null then
    return;
  end if;

  if base_role = 'driver' then
    -- find PASSENGERS matching a driver trip
    return query
    select
      t.id::text,
      t.creator_user_id::text,
      ST_DistanceSphere(t.pickup, base_pick)/1000.0 as distance_km,
      t.created_at
    from public.trips t
    where t.status = 'open'
      and t.role = 'passenger'
      and coalesce(lower(t.vehicle_type),'') = coalesce(lower(base_vehicle),'')
    order by
      ST_DistanceSphere(t.pickup, base_pick) +
      case
        when _prefer_dropoff and base_drop is not null and t.dropoff is not null
          then least(5000.0, ST_DistanceSphere(t.dropoff, base_drop)) * 0.5
        else 0
      end
    limit _limit;
  else
    -- if the input trip is passenger, return nearby passengers for completeness
    return query
    select
      t.id::text,
      t.creator_user_id::text,
      ST_DistanceSphere(t.pickup, base_pick)/1000.0 as distance_km,
      t.created_at
    from public.trips t
    where t.status = 'open'
      and t.role = 'passenger'
      and coalesce(lower(t.vehicle_type),'') = coalesce(lower(base_vehicle),'')
    order by
      ST_DistanceSphere(t.pickup, base_pick) +
      case
        when _prefer_dropoff and base_drop is not null and t.dropoff is not null
          then least(5000.0, ST_DistanceSphere(t.dropoff, base_drop)) * 0.5
        else 0
      end
    limit _limit;
  end if;
end
$fn$;

commit;
