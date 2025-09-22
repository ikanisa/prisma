-- Fix: nearby_passengers_with_distance should use trips.creator_user_id (not t.user_id)

create or replace function public.nearby_passengers_with_distance(
  in_lat double precision,
  in_lng double precision,
  in_vehicle_type text,
  in_radius_km numeric,
  in_max integer
)
returns table (
  user_id uuid,
  whatsapp_e164 text,
  created_at timestamptz,
  distance_km numeric
)
language sql
stable
as $$
  select
    t.creator_user_id as user_id,
    p.whatsapp_e164,
    t.created_at,
    round(
      public.st_distance_sphere(
        t.pickup::geometry,
        st_setsrid(st_makepoint(in_lng, in_lat), 4326)
      ) / 1000.0
    , 2) as distance_km
  from trips t
  join profiles p on p.user_id = t.creator_user_id
  where
    t.status = 'open'
    and t.pickup is not null
    and (in_vehicle_type is null or t.vehicle_type = in_vehicle_type)
    and public.st_dwithin_sphere(
          t.pickup::geometry,
          st_setsrid(st_makepoint(in_lng, in_lat), 4326),
          (coalesce(in_radius_km, 5) * 1000.0)
        )
  order by distance_km asc, t.created_at desc
  limit greatest(1, coalesce(in_max, 10));
$$;
