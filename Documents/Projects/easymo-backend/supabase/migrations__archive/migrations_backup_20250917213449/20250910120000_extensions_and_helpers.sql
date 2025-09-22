-- Extensions (idempotent)
create extension if not exists pgcrypto;
create extension if not exists postgis;

-- km(): meters -> km; harmless if re-run
create or replace function public.km(a geography, b geography)
returns numeric language sql immutable as $$
  select st_distance(a,b) / 1000.0
$$;
