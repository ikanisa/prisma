-- remove all old versions of nearby_* so we start fresh
do $$
declare r record;
begin
  for r in
    select p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('nearby_drivers','nearby_passengers','nearby_businesses')
  loop
    execute format('drop function public.%s(%s);', r.proname, r.args);
  end loop;
end$$;

-- tiny distance helper (no round(), no precision traps)
create or replace function public.km(a geography, b geography)
returns numeric language sql immutable as $$
  select (ST_Distance(a,b)/1000.0)::numeric
$$;

-- BUSINESSES: always visible, no "served", no category filter (keep it simple)
create or replace function public.nearby_businesses(
  _lat double precision, _lon double precision, _viewer text, _limit int
)
returns table(id uuid, name text, description text, distance_km numeric)
language sql stable as $$
  with pt as (select ST_SetSRID(ST_Point(_lon,_lat),4326)::geography g)
  select b.id, b.name, coalesce(b.description,''), km(b.geo, pt.g) as distance_km
  from public.businesses b, pt
  where b.geo is not null and b.is_active = true
  order by distance_km asc, b.created_at desc
  limit greatest(1, coalesce(_limit,10));
$$;

-- claim tables for mobility (short-lived "served")
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

-- DRIVERS
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
        and sd.driver_contact_id = d.user_id
        and sd.expires_at > now()
    )
  order by distance_km asc, d.last_seen desc
  limit greatest(1, coalesce(_limit,10));
$$;

-- PASSENGERS
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
  where t.role='passenger'
    and t.status='open'
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
