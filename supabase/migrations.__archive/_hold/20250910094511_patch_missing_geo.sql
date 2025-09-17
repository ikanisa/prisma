-- Patch missing location columns + indexes for existing tables

-- 1) businesses.geo
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='businesses' and column_name='geo'
  ) then
    alter table public.businesses add column geo geography(Point,4326);
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='idx_businesses_geo'
  ) then
    create index idx_businesses_geo on public.businesses using gist(geo);
  end if;
end$$;

-- 2) drivers.geo (+ helper columns, just in case)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='drivers' and column_name='geo'
  ) then
    alter table public.drivers add column geo geography(Point,4326);
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='drivers' and column_name='vehicle_type'
  ) then
    alter table public.drivers add column vehicle_type text default 'any';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='drivers' and column_name='is_available'
  ) then
    alter table public.drivers add column is_available boolean default true;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='drivers' and column_name='last_seen'
  ) then
    alter table public.drivers add column last_seen timestamptz default now();
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='idx_drivers_geo'
  ) then
    create index idx_drivers_geo on public.drivers using gist(geo);
  end if;
end$$;

-- 3) passenger_trips.pickup/dest
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='passenger_trips' and column_name='pickup'
  ) then
    alter table public.passenger_trips add column pickup geography(Point,4326);
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='passenger_trips' and column_name='dest'
  ) then
    alter table public.passenger_trips add column dest geography(Point,4326);
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='idx_passenger_trips_pickup'
  ) then
    create index idx_passenger_trips_pickup on public.passenger_trips using gist(pickup);
  end if;
end$$;

-- 4) (Re)create helpers that rely on those columns
create or replace function public.km(a geography, b geography)
returns numeric language sql immutable as $$
  select round(st_distance(a,b)::numeric / 1000, 2)
$$;

create or replace function public.nearby_businesses(_lat double precision, _lon double precision, _viewer text, _limit int)
returns table(id uuid, name text, description text, distance_km numeric) language sql stable as $$
  select b.id, b.name, coalesce(b.description,''), km(b.geo, st_setsrid(st_point(_lon,_lat),4326)::geography) as distance_km
  from public.businesses b
  where b.is_active = true
    and b.geo is not null
    and not exists (
      select 1 from public.served_matches sm
       where sm.viewer_msisdn = _viewer and sm.kind='business' and sm.target_id=b.id
    )
  order by b.created_at desc, distance_km asc
  limit coalesce(_limit, 10)
$$;

create or replace function public.nearby_passengers(_lat double precision, _lon double precision, _viewer text, _limit int, _vehicle text)
returns table(id uuid, rider_msisdn text, distance_km numeric, vehicle_type text) language sql stable as $$
  select t.id, t.rider_msisdn,
         km(t.pickup, st_setsrid(st_point(_lon,_lat),4326)::geography) as distance_km,
         t.vehicle_type
  from public.passenger_trips t
  where t.status='open'
    and not exists (
      select 1 from public.served_matches sm
       where sm.viewer_msisdn = _viewer and sm.kind='passenger' and sm.target_id=t.id
    )
  order by t.created_at desc, distance_km asc
  limit coalesce(_limit, 10)
$$;

create or replace function public.nearby_drivers(_lat double precision, _lon double precision, _viewer text, _limit int, _vehicle text)
returns table(msisdn text, distance_km numeric, vehicle_type text) language sql stable as $$
  select d.msisdn,
         km(d.geo, st_setsrid(st_point(_lon,_lat),4326)::geography) as distance_km,
         coalesce(d.vehicle_type,'any')
  from public.drivers d
  where d.is_available = true and d.geo is not null
    and (_vehicle is null or _vehicle='any' or d.vehicle_type=_vehicle)
    and not exists (
      select 1 from public.served_matches sm
       where sm.viewer_msisdn = _viewer and sm.kind='driver' and sm.target_id::text=d.msisdn
    )
  order by d.last_seen desc, distance_km asc
  limit coalesce(_limit, 10)
$$;
