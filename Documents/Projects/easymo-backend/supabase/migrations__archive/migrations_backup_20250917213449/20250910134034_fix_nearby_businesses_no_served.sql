-- Businesses are NEVER filtered by "served". Also avoid uuid/bigint comparisons.
-- Safe to re-create.
create extension if not exists postgis;

create or replace function public.nearby_businesses(
  _lat double precision,
  _lon double precision,
  _viewer text,   -- kept only for consistent signature; not used for filtering
  _limit int
)
returns table(id uuid, name text, description text, distance_km numeric)
language sql stable as $$
  select
    b.id,
    b.name,
    coalesce(b.description,'') as description,
    ST_Distance(
      b.geo,
      ST_SetSRID(ST_Point(_lon,_lat),4326)::geography
    )/1000.0 as distance_km
  from public.businesses b
  where b.is_active = true
    and b.geo is not null
  order by distance_km nulls last
  limit _limit;
$$;
