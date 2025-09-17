-- 1) Make sure required extensions exist (safe if already there)
create extension if not exists pgcrypto;
create extension if not exists postgis;

-- 2) A tiny helper to compute distance in km (safe to re-create)
create or replace function public.km(a geography, b geography)
returns numeric language sql immutable as $$
  select st_distance(a,b) / 1000.0
$$;

-- 3) Harden businesses table so nearby works consistently
alter table public.businesses
  add column if not exists description text,
  add column if not exists is_active boolean not null default true,
  add column if not exists geo geography(Point,4326);

-- Backfill geo from legacy column "location" if present
do $$
begin
  if exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='businesses' and column_name='location'
  ) then
    update public.businesses
      set geo = coalesce(geo, location);
  end if;
end$$;

create index if not exists idx_businesses_geo on public.businesses using gist(geo);
create index if not exists idx_businesses_created on public.businesses(created_at);

-- 4) Universal “served” table uses TEXT key so we never compare uuid vs bigint again
create type if not exists public.match_kind as enum ('driver','passenger','business');

create table if not exists public.served_matches (
  id bigserial primary key,
  viewer_msisdn text not null,
  kind public.match_kind not null,
  target_pk text not null,                -- store the target primary key as TEXT
  served_at timestamptz not null default now(),
  unique (viewer_msisdn, kind, target_pk)
);

-- If older column target_id exists, convert it into target_pk TEXT and drop it
do $$
begin
  if exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='served_matches' and column_name='target_id'
  ) then
    alter table public.served_matches
      add column if not exists target_pk text;

    update public.served_matches
      set target_pk = target_id::text
      where target_pk is null;

    -- Old unique constraints on (viewer_msisdn, kind, target_id) can stay or be re-made on target_pk.
    -- Create a unique index on the new columns (safe if it already exists).
    create unique index if not exists ux_served_viewer_kind_pk
      on public.served_matches(viewer_msisdn, kind, target_pk);

    alter table public.served_matches
      drop column if exists target_id;
  end if;
end$$;

-- Lock served_matches (deny all); Edge Functions use service key
alter table public.served_matches enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='served_matches'
  ) then
    create policy no_public_served on public.served_matches for all using (false);
  end if;
end$$;

-- 5) Helper to mark something as served (idempotent)
create or replace function public.mark_served(_viewer text, _kind public.match_kind, _target_pk text)
returns void language sql as $$
  insert into public.served_matches(viewer_msisdn, kind, target_pk)
  values (_viewer, _kind, _target_pk)
  on conflict (viewer_msisdn, kind, target_pk) do nothing;
$$;

-- 6) REPLACE the old nearby_businesses with a TEXT-safe version
--    We DROP the old signature first so return-type changes don't error.
drop function if exists public.nearby_businesses(double precision,double precision,text,int);

create function public.nearby_businesses(
  _lat double precision,
  _lon double precision,
  _viewer text,
  _limit int
) returns table(
  id text,                       -- NOTE: return id as TEXT (safe for any PK type)
  name text,
  description text,
  distance_km numeric
) language sql stable as $$
  select
    b.id::text as id,
    b.name,
    coalesce(b.description,'') as description,
    km(b.geo, st_setsrid(st_point(_lon,_lat),4326)::geography) as distance_km
  from public.businesses b
  where b.is_active = true
    and b.geo is not null
    and not exists (
      select 1
      from public.served_matches sm
      where sm.viewer_msisdn = _viewer
        and sm.kind = 'business'
        and sm.target_pk = b.id::text  -- TEXT = TEXT ✅
    )
  order by b.created_at desc, distance_km asc
  limit greatest(_limit,1);
$$;
