-- 1) Make served_matches exist and make target_id TEXT (polymorphic-safe)
create table if not exists public.served_matches (
  id bigserial primary key,
  viewer_msisdn text not null,
  kind text not null check (kind in ('driver','passenger','business')),
  target_id text not null,
  created_at timestamptz default now(),
  unique (viewer_msisdn, kind, target_id)
);

-- If the column exists with a non-text type, coerce it to TEXT safely
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='served_matches'
      and column_name='target_id' and data_type <> 'text'
  ) then
    alter table public.served_matches
      alter column target_id type text using target_id::text;
  end if;
end$$;

-- Helpful index for lookups
create index if not exists idx_served_matches_lookup
  on public.served_matches (viewer_msisdn, kind, target_id);

-- 2) Recreate nearby_businesses comparing TEXT to TEXT
--    Uses PostGIS geography distance in KM (no custom km() needed)
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
    round(
      st_distance(
        b.geo,
        st_setsrid(st_point(_lon, _lat),4326)::geography
      ) / 1000.0,
      2
    ) as distance_km
  from public.businesses b
  where coalesce(b.is_active, true) = true
    and b.geo is not null
    and not exists (
      select 1
      from public.served_matches sm
      where sm.viewer_msisdn = _viewer
        and sm.kind = 'business'
        and sm.target_id = b.id::text
    )
  order by b.created_at desc, distance_km asc
  limit greatest(_limit, 1);
$$;
