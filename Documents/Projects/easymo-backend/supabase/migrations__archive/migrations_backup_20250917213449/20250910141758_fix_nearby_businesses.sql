create extension if not exists postgis;

create or replace function public.nearby_businesses(
  _lat double precision,
  _lon double precision,
  _viewer text,
  _limit int
)
returns table(id uuid, name text, description text, distance_km numeric)
language sql
stable
as $$
  select b.id,
         b.name,
         coalesce(b.description, '') as description,
         km(
           b.geo,
           ST_SetSRID(ST_Point(_lon, _lat), 4326)::geography
         ) as distance_km
  from public.businesses b
  where b.is_active = true
    and b.geo is not null
  order by distance_km nulls last
  limit _limit;
$$;
