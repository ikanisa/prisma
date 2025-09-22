-- Driver live status
create table if not exists public.driver_status (
  user_id uuid primary key,
  vehicle_type text,
  location geography(Point,4326),
  last_seen timestamptz,
  online boolean default true
);
create index if not exists idx_driver_status_loc on public.driver_status using gist(location);

-- Trips (passenger intents or driver listings)
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid references public.profiles(user_id) on delete set null,
  role text check (role in ('passenger','driver')) not null,
  vehicle_type text,
  pickup geography(Point,4326),
  status text check (status in ('open','closed')) not null default 'open',
  created_at timestamptz default now()
);
create index if not exists idx_trips_pickup on public.trips using gist(pickup);
create index if not exists idx_trips_role_status on public.trips(role,status,created_at);

-- Served matches (ONLY mobility). Target kept as TEXT to avoid uuid/bigint mismatches.
create table if not exists public.served_matches (
  id bigserial primary key,
  viewer_msisdn text not null,
  kind text check (kind in ('driver','passenger')) not null,
  target_id text not null,
  created_at timestamptz default now(),
  unique(viewer_msisdn, kind, target_id)
);

-- Mark served
create or replace function public.mark_served(_viewer text, _kind text, _target_pk text)
returns void language plpgsql security definer as $$
begin
  insert into public.served_matches(viewer_msisdn,kind,target_id)
  values(_viewer, _kind, _target_pk)
  on conflict do nothing;
end$$;

-- Nearby drivers (excludes served)
create or replace function public.nearby_drivers(
  _lat double precision, _lon double precision, _viewer text, _limit int
) returns table(
  id text, whatsapp_e164 text, ref_code text, distance_km numeric, last_seen timestamptz
) language sql stable as $$
  with pt as (select ST_SetSRID(ST_Point(_lon,_lat),4326)::geography g)
  select p.user_id::text as id, p.whatsapp_e164, p.ref_code,
         km(d.location, pt.g) as distance_km, d.last_seen
  from public.driver_status d
  join public.profiles p on p.user_id = d.user_id
  , pt
  where d.online = true and d.location is not null
    and not exists (
      select 1 from public.served_matches sm
      where sm.viewer_msisdn=_viewer and sm.kind='driver' and sm.target_id = p.user_id::text
    )
  order by km(d.location, pt.g) asc, d.last_seen desc
  limit greatest(1, coalesce(_limit,10))
$$;

-- Nearby passengers (excludes served)
create or replace function public.nearby_passengers(
  _lat double precision, _lon double precision, _viewer text, _limit int
) returns table(
  id text, creator_user_id uuid, created_at timestamptz, whatsapp_e164 text, distance_km numeric
) language sql stable as $$
  with pt as (select ST_SetSRID(ST_Point(_lon,_lat),4326)::geography g)
  select t.id::text as id, t.creator_user_id, t.created_at, p.whatsapp_e164,
         km(t.pickup, pt.g) as distance_km
  from public.trips t
  join public.profiles p on p.user_id = t.creator_user_id
  , pt
  where t.role='passenger' and t.status='open' and t.pickup is not null
    and not exists (
      select 1 from public.served_matches sm
      where sm.viewer_msisdn=_viewer and sm.kind='passenger' and sm.target_id = t.id::text
    )
  order by t.created_at desc, km(t.pickup, pt.g) asc
  limit greatest(1, coalesce(_limit,10))
$$;
