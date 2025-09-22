-- 0) helpers (safe to re-create)
create extension if not exists postgis;
create extension if not exists pgcrypto;

-- 1) SERVED tables (domain-specific; businesses are NEVER served)
create table if not exists public.served_drivers (
  viewer_passenger_msisdn text not null,
  driver_contact_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (viewer_passenger_msisdn, driver_contact_id)
);

create table if not exists public.served_passengers (
  viewer_driver_msisdn text not null,
  passenger_trip_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (viewer_driver_msisdn, passenger_trip_id)
);

-- 2) Minimal tables (created only if missing; won't touch existing ones)
create table if not exists public.profiles (
  user_id uuid primary key default gen_random_uuid(),
  whatsapp_e164 text unique,
  display_name text,
  created_at timestamptz default now()
);

create table if not exists public.driver_status (
  user_id uuid primary key,
  vehicle_type text,
  location geography(Point,4326),
  last_seen timestamptz,
  online boolean default true
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid,
  role text,                -- 'driver' | 'passenger'
  vehicle_type text,
  pickup geography(Point,4326),
  status text,              -- 'open' | 'closed'
  created_at timestamptz default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid,
  category_id integer,
  name text not null,
  description text,
  geo geography(Point,4326),
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists idx_businesses_geo on public.businesses using gist(geo);

-- 3) Nearby businesses (NO served filter; optional category)
create or replace function public.nearby_businesses(
  _lat double precision,
  _lon double precision,
  _viewer text,
  _limit int,
  _category_id integer default null
)
returns table(id uuid, name text, description text, distance_km numeric)
language sql stable as $$
  select b.id,
         b.name,
         coalesce(b.description,'') as description,
         ST_Distance(
           b.geo,
           ST_SetSRID(ST_Point(_lon,_lat),4326)::geography
         )/1000.0 as distance_km
  from public.businesses b
  where b.is_active = true
    and b.geo is not null
    and (_category_id is null or b.category_id = _category_id)
  order by distance_km nulls last
  limit _limit;
$$;

-- 4) Nearby drivers (served applies)
create or replace function public.nearby_drivers(
  _lat double precision,
  _lon double precision,
  _viewer text,
  _limit int
)
returns table(user_id uuid, whatsapp_e164 text, distance_km numeric, last_seen timestamptz)
language sql stable as $$
  select d.user_id,
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
      select 1 from public.served_drivers sd
      where sd.viewer_passenger_msisdn = _viewer
        and sd.driver_contact_id = d.user_id
        and sd.expires_at > now()
    )
  order by distance_km nulls last, d.last_seen desc
  limit _limit;
$$;

-- 5) Nearby passengers (served applies)
create or replace function public.nearby_passengers(
  _lat double precision,
  _lon double precision,
  _viewer text,
  _limit int
)
returns table(id uuid, creator_user_id uuid, distance_km numeric, created_at timestamptz, whatsapp_e164 text)
language sql stable as $$
  select t.id,
         t.creator_user_id,
         ST_Distance(
           t.pickup,
           ST_SetSRID(ST_Point(_lon,_lat),4326)::geography
         )/1000.0 as distance_km,
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
  order by distance_km nulls last, t.created_at desc
  limit _limit;
$$;

-- 6) Mark served (only driver/passenger; businesses are NEVER served)
create or replace function public.mark_served(
  _viewer text,
  _kind text,
  _target_pk text
) returns void
language plpgsql as $$
begin
  if _kind = 'driver' then
    insert into public.served_drivers (viewer_passenger_msisdn, driver_contact_id, expires_at)
    values (_viewer, (_target_pk)::uuid, now() + interval '15 minutes')
    on conflict (viewer_passenger_msisdn, driver_contact_id)
    do update set expires_at = excluded.expires_at, created_at = now();

  elsif _kind = 'passenger' then
    insert into public.served_passengers (viewer_driver_msisdn, passenger_trip_id, expires_at)
    values (_viewer, (_target_pk)::uuid, now() + interval '15 minutes')
    on conflict (viewer_driver_msisdn, passenger_trip_id)
    do update set expires_at = excluded.expires_at, created_at = now();

  else
    -- businesses are never served; do nothing
    perform 1;
  end if;
end;
$$;
