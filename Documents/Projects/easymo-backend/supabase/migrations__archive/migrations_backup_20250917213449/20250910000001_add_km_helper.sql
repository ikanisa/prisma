-- Adds a tiny helper so existing SQL can call km(a,b) for distances in kilometers.
-- Safe to run multiple times (CREATE OR REPLACE) and uses PostGIS geography,
-- which is what ST_Distance expects for meters on a spheroid.

begin;

create extension if not exists postgis;

-- Primary signature used by nearby_businesses / RPCs
create or replace function public.km(a geography, b geography)
returns numeric
language sql
immutable
parallel safe
as $$
  select round((st_distance(a, b) / 1000.0)::numeric, 2)
$$;

-- Convenience overload in case callers pass geometries
create or replace function public.km(a geometry, b geometry)
returns numeric
language sql
immutable
parallel safe
as $$
  select round((st_distance(a::geography, b::geography) / 1000.0)::numeric, 2)
$$;

commit;
