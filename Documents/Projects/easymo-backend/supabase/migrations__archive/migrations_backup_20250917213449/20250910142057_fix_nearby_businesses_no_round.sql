create extension if not exists postgis;

-- Recreate nearby_businesses with a safe cast instead of round()
-- NOTE: businesses are NEVER filtered by “served”
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
    coalesce(b.description, '') as description,
    (
      st_distance(
        b.geo,
        st_setsrid(st_point(_lon, _lat), 4326)::geography
      ) / 1000.0
    )::numeric(10,2) as distance_km
  from public.businesses b
  where b.is_active = true
    and b.geo is not null
  order by distance_km nulls last
  limit _limit;
$$;
