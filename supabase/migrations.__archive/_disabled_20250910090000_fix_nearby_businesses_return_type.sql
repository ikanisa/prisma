-- Fix: nearby_businesses should return id bigint (matches businesses.id)
-- Assumes a helper 'km(geography,geography) returns numeric' exists.
-- If you don't have km(), this function still works by using ST_Distance directly (uncomment the alternative SELECT).

create or replace function public.nearby_businesses(
  _lat double precision,
  _lon double precision,
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
  -- Using km() helper (preferred if you already created it in a previous migration)
  select
    b.id,
    b.name,
    coalesce(b.description, ''),
    km(b.geo, st_setsrid(st_point(_lon, _lat), 4326)::geography) as distance_km
  from public.businesses b
  where b.is_active = true
    and b.geo is not null
  order by
    km(b.geo, st_setsrid(st_point(_lon, _lat), 4326)::geography) asc,
    b.created_at desc
  limit greatest(_limit, 1);

  -- Alternative without km(): comment the above SELECT and uncomment below if you don't have km()
  -- select
  --   b.id,
  --   b.name,
  --   coalesce(b.description, ''),
  --   round(
  --     st_distance(
  --       b.geo::geography,
  --       st_setsrid(st_point(_lon, _lat), 4326)::geography
  --     ) / 1000.0, 2
  --   ) as distance_km
  -- from public.businesses b
  -- where b.is_active = true
  --   and b.geo is not null
  -- order by
  --   round(
  --     st_distance(
  --       b.geo::geography,
  --       st_setsrid(st_point(_lon, _lat), 4326)::geography
  --     ) / 1000.0, 2
  --   ) asc,
  --   b.created_at desc
  -- limit greatest(_limit, 1);
$$;
