-- Distance compatibility shim so migrations that call st_distance_sphere work everywhere.
-- We implement it via geography-based distance (meters) which is accurate and widely supported.

create or replace function public.st_distance_sphere(a geometry, b geometry)
returns double precision
language sql
immutable
as $$
  -- Returns meters
  select ST_Distance(geography(a), geography(b));
$$;

create or replace function public.st_dwithin_sphere(a geometry, b geometry, max_meters double precision)
returns boolean
language sql
immutable
as $$
  -- True if the two geometries are within max_meters (meters)
  select ST_DWithin(geography(a), geography(b), max_meters);
$$;
