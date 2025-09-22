create extension if not exists postgis;

-- Replace any old definition
drop function if exists public.km(geography, geography);

-- Round requires NUMERIC; cast first, then round to 2 decimal places.
create or replace function public.km(a geography, b geography)
returns numeric
language sql
immutable
as $$
  select round( (st_distance(a, b) / 1000.0)::numeric, 2 )
$$;
