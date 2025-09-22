-- 1) Served matches table (idempotent). We keep target_id as TEXT so it can store uuid or bigint safely.
create table if not exists public.served_matches (
  viewer_msisdn text not null,
  kind text not null check (kind in ('driver','passenger','business')),
  target_id text not null,
  created_at timestamptz default now(),
  primary key (viewer_msisdn, kind, target_id)
);

-- 2) Helper to compute distance in km (idempotent). If you already have one, this will just replace it.
create or replace function public.km(a geography, b geography)
returns numeric language sql immutable as $$
  select round(st_distance(a, b) / 1000.0, 2)
$$;

-- 3) Recreate the function with a safe cast to TEXT to avoid uuid/bigint equality errors.
create or replace function public.nearby_businesses(
  _lat double precision,
  _lon double precision,
  _viewer text,
  _limit int
)
returns table(
  id uuid,
  name text,
  description text,
  distance_km numeric
)
language sql
stable
as $$
  select
    b.id,
    b.name,
    coalesce(b.description, ''),
    km(b.geo, st_setsrid(st_point(_lon, _lat), 4326)::geography) as distance_km
  from public.businesses b
  where b.is_active = true
    and b.geo is not null
    and not exists (
      select 1
      from public.served_matches sm
      where sm.viewer_msisdn = _viewer
        and sm.kind = 'business'
        and sm.target_id = b.id::text   -- <— compare as TEXT to avoid uuid/bigint mismatch
    )
  order by b.created_at desc
  limit greatest(_limit, 1);
$$;
