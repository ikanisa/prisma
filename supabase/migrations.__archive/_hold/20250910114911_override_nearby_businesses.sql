-- Ensure served_matches.target_id is TEXT (safe for uuid/bigint)
alter table public.served_matches
  alter column target_id type text using target_id::text;

-- Drop the old nearby_businesses if it exists (no harm if not)
drop function if exists public.nearby_businesses(double precision, double precision, text, int);

-- Recreate nearby_businesses with TEXT comparison
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
    round(st_distance(b.geo, st_setsrid(st_point(_lon, _lat),4326)::geography)/1000.0, 2) as distance_km
  from public.businesses b
  where coalesce(b.is_active,true) = true
    and b.geo is not null
    and not exists (
      select 1
      from public.served_matches sm
      where sm.viewer_msisdn = _viewer
        and sm.kind = 'business'
        and sm.target_id = b.id::text  -- always compare as text
    )
  order by b.created_at desc, distance_km asc
  limit greatest(_limit, 1);
$$;
