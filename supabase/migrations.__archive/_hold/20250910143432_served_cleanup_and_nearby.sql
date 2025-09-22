-- ✅ Domain-specific "served" only for mobility. Businesses are always visible.
-- ✅ All UUIDs, no uuid=bigint comparisons ever again.
-- ✅ Idempotent. Safe to re-run.

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- 0) Drop the old polymorphic table if it ever existed (silently ignore)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='served_matches'
  ) then
    drop table public.served_matches;
  end if;
end$$ language plpgsql;

-- 1) Mobility "served" (claims) — passengers seeing drivers
create table if not exists public.served_drivers (
  viewer_passenger_msisdn text not null,
  driver_user_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (viewer_passenger_msisdn, driver_user_id)
);
alter table public.served_drivers enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='served_drivers'
  ) then
    create policy deny_all_sd on public.served_drivers for all using (false);
  end if;
end$$;

-- 2) Mobility "served" (claims) — drivers seeing passengers
create table if not exists public.served_passengers (
  viewer_driver_msisdn text not null,
  passenger_trip_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (viewer_driver_msisdn, passenger_trip_id)
);
alter table public.served_passengers enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='served_passengers'
  ) then
    create policy deny_all_sp on public.served_passengers for all using (false);
  end if;
end$$;

-- 3) Helper: mark a target as served (drivers/passengers only)
create or replace function public.mark_served(
  _viewer text,
  _kind text,          -- 'driver' | 'passenger' | 'business' (business ignored)
  _target_pk uuid,     -- driver_user_id or passenger_trip_id
  _ttl_minutes int default 15
) returns void
language plpgsql
as $$
begin
  if _kind = 'driver' then
    insert into public.served_drivers(viewer_passenger_msisdn, driver_user_id, expires_at)
    values (_viewer, _target_pk, now() + make_interval(mins => _ttl_minutes))
    on conflict (viewer_passenger_msisdn, driver_user_id)
    do update set expires_at = excluded.expires_at, created_at = now();

  elsif _kind = 'passenger' then
    insert into public.served_passengers(viewer_driver_msisdn, passenger_trip_id, expires_at)
    values (_viewer, _target_pk, now() + make_interval(mins => _ttl_minutes))
    on conflict (viewer_driver_msisdn, passenger_trip_id)
    do update set expires_at = excluded.expires_at, created_at = now();

  else
    -- businesses are never marked served; do nothing
    perform 1;
  end if;
end
$$;

-- 4) Nearby BUSINESSES (never uses "served"). We don't rely on any is_active column.
--    Returns distance in KM as numeric(10,2).
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
    (st_distance(
       b.geo,
       st_setsrid(st_point(_lon,_lat), 4326)::geography
     ) / 1000.0)::numeric(10,2) as distance_km
  from public.businesses b
  where b.geo is not null
  order by distance_km asc
  limit _limit;
$$;

-- 5) Nearby DRIVERS for a passenger viewer (excludes served_drivers not yet expired)
--    Requires public.driver_status(user_id uuid, location geography, online bool, last_seen ts)
--    and public.profiles(user_id uuid, whatsapp_e164 text)
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
    (st_distance(
       d.location,
       st_setsrid(st_point(_lon,_lat), 4326)::geography
     ) / 1000.0)::numeric(10,2) as distance_km,
    d.last_seen
  from public.driver_status d
  join public.profiles p on p.user_id = d.user_id
  where d.online = true
    and d.location is not null
    and not exists (
      select 1
      from public.served_drivers sd
      where sd.viewer_passenger_msisdn = _viewer
        and sd.driver_user_id = d.user_id
        and sd.expires_at > now()
    )
  order by distance_km asc, d.last_seen desc
  limit _limit;
$$;

-- 6) Nearby PASSENGERS for a driver viewer (excludes served_passengers not yet expired)
--    Requires public.trips(id uuid, role text, status text, pickup geography, created_at ts, creator_user_id uuid)
create or replace function public.nearby_passengers(
  _lat double precision,
  _lon double precision,
  _viewer text,
  _limit int
)
returns table(trip_id uuid, creator_user_id uuid, distance_km numeric, created_at timestamptz, whatsapp_e164 text)
language sql stable as $$
  select
    t.id as trip_id,
    t.creator_user_id,
    (st_distance(
       t.pickup,
       st_setsrid(st_point(_lon,_lat), 4326)::geography
     ) / 1000.0)::numeric(10,2) as distance_km,
    t.created_at,
    p.whatsapp_e164
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
  order by distance_km asc, t.created_at desc
  limit _limit;
$$;
