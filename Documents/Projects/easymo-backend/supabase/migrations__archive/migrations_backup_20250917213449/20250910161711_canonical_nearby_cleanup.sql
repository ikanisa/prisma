-- 0) Normalize any column name drift in the served tables (safe if absent)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='served_drivers' and column_name='driver_contact_id'
  ) then
    alter table public.served_drivers rename column driver_contact_id to driver_user_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='served_passengers' and column_name='passenger_id'
  ) then
    alter table public.served_passengers rename column passenger_id to passenger_trip_id;
  end if;
end$$;

-- 1) Ensure the two tiny "served" tables exist with the expected columns/PKs
create table if not exists public.served_drivers(
  viewer_passenger_msisdn text not null,
  driver_user_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key(viewer_passenger_msisdn, driver_user_id)
);

create table if not exists public.served_passengers(
  viewer_driver_msisdn text not null,
  passenger_trip_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key(viewer_driver_msisdn, passenger_trip_id)
);

-- 2) Drop EVERY overload/duplicate of the nearby_* functions
do $$
declare r record;
begin
  for r in
    select p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public'
      and p.proname in ('nearby_businesses','nearby_drivers','nearby_passengers')
  loop
    execute format('drop function public.%I(%s);', r.proname, r.args);
  end loop;
end$$;

-- 3) Small distance helper (no round(), avoids type errors)
create or replace function public.km(a geography, b geography)
returns numeric language sql immutable as $$
  select (ST_Distance(a,b)/1000.0)::numeric
$$;

-- 4) Re-create the three RPCs with ONE canonical signature each
--    Signatures the Edge Function expects:
--      (_lat double precision, _lon double precision, _viewer text, _limit int)

-- 4.a) Businesses: ALWAYS visible (no served filtering)
create or replace function public.nearby_businesses(
  _lat double precision, _lon double precision, _viewer text, _limit int
)
returns table(id uuid, name text, description text, distance_km numeric)
language sql stable as $$
  with pt as (select ST_SetSRID(ST_Point(_lon,_lat),4326)::geography g)
  select b.id, b.name, coalesce(b.description,''), km(b.geo, pt.g) as distance_km
  from public.businesses b, pt
  where b.geo is not null
    and coalesce(b.is_active, true) = true
  order by distance_km asc, b.created_at desc
  limit greatest(1, coalesce(_limit,10));
$$;

-- 4.b) Drivers: exclude already served to this passenger (by msisdn)
create or replace function public.nearby_drivers(
  _lat double precision, _lon double precision, _viewer text, _limit int
)
returns table(driver_user_id uuid, whatsapp_e164 text, distance_km numeric, last_seen timestamptz)
language sql stable as $$
  select
    d.user_id as driver_user_id,
    p.whatsapp_e164,
    km(d.location, ST_SetSRID(ST_Point(_lon,_lat),4326)::geography) as distance_km,
    d.last_seen
  from public.driver_status d
  join public.profiles p on p.user_id = d.user_id
  where d.online = true
    and d.location is not null
    and not exists (
      select 1 from public.served_drivers sd
      where sd.viewer_passenger_msisdn = _viewer
        and sd.driver_user_id = d.user_id
        and sd.expires_at > now()
    )
  order by distance_km asc, d.last_seen desc
  limit greatest(1, coalesce(_limit,10));
$$;

-- 4.c) Passengers: exclude already served to this driver (by msisdn)
create or replace function public.nearby_passengers(
  _lat double precision, _lon double precision, _viewer text, _limit int
)
returns table(trip_id uuid, creator_user_id uuid, distance_km numeric, created_at timestamptz, whatsapp_e164 text)
language sql stable as $$
  select
    t.id as trip_id,
    t.creator_user_id,
    km(t.pickup, ST_SetSRID(ST_Point(_lon,_lat),4326)::geography) as distance_km,
    t.created_at,
    p.whatsapp_e164
  from public.trips t
  join public.profiles p on p.user_id = t.creator_user_id
  where t.role = 'passenger'
    and t.status = 'open'
    and t.pickup is not null
    and not exists (
      select 1 from public.served_passengers sp
      where sp.viewer_driver_msisdn = _viewer
        and sp.passenger_trip_id = t.id
        and sp.expires_at > now()
    )
  order by distance_km asc, t.created_at desc
  limit greatest(1, coalesce(_limit,10));
$$;

-- 5) Guard: fail the migration if duplicates sneak back in
do $$
declare bad int;
begin
  select count(*) into bad
  from (
    select proname, count(*) c
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and proname in ('nearby_businesses','nearby_drivers','nearby_passengers')
    group by proname
    having count(*) > 1
  ) x;

  if bad > 0 then
    raise exception 'duplicate nearby_* functions remain — clean your migrations';
  end if;
end$$;
