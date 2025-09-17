-- DRIVERS v2: add distance_km (keep vehicle_type optional via NULL)
create or replace function public.recent_drivers_near_v2(
  in_lat double precision, in_lng double precision,
  in_vehicle_type text, in_radius_km numeric, in_max integer
) returns table (
  ref_code char(6), whatsapp_e164 text, last_seen timestamptz, user_id uuid, distance_km numeric
) language sql stable as $$
  select p.ref_code, p.whatsapp_e164, d.last_seen, d.user_id,
         km(d.location::geography, st_setsrid(st_point(in_lng,in_lat),4326)::geography) as distance_km
  from public.driver_status d
  join public.profiles p on p.user_id = d.user_id
  where d.online = true
    and d.location is not null
    and (in_vehicle_type is null or d.vehicle_type = in_vehicle_type)
    and st_dwithin(d.location::geography,
                   st_setsrid(st_point(in_lng,in_lat),4326),
                   in_radius_km * 1000)
  order by d.last_seen desc
  limit greatest(in_max,1);
$$;

-- PASSENGERS v2: add distance_km
create or replace function public.recent_passenger_trips_near_v2(
  in_lat double precision, in_lng double precision,
  in_vehicle_type text, in_radius_km numeric, in_max integer
) returns table (
  trip_id bigint, creator_user_id uuid, created_at timestamptz, distance_km numeric
) language sql stable as $$
  select t.id, t.creator_user_id, t.created_at,
         km(t.pickup::geography, st_setsrid(st_point(in_lng,in_lat),4326)::geography) as distance_km
  from public.trips t
  where t.role='passenger' and t.status='open'
    and (in_vehicle_type is null or t.vehicle_type = in_vehicle_type)
    and st_dwithin(t.pickup::geography,
                   st_setsrid(st_point(in_lng,in_lat),4326),
                   in_radius_km * 1000)
  order by t.created_at desc
  limit greatest(in_max,1);
$$;

-- BUSINESSES v2: return distance_km and exclude served via universal TEXT key
-- NOTE: businesses.id is typically BIGINT; we compare through TEXT via sm.target_pk = b.id::text
create or replace function public.nearby_businesses_v2(
  in_lat double precision,
  in_lng double precision,
  in_category_id integer,
  in_radius_km numeric,
  in_max integer,
  viewer_msisdn text
) returns table (
  id bigint, name text, description text, distance_km numeric
) language sql stable as $$
  select b.id, b.name, coalesce(b.description,'') as description,
         km(b.geo, st_setsrid(st_point(in_lng,in_lat),4326)::geography) as distance_km
  from public.businesses b
  where b.is_active = true
    and b.geo is not null
    and (in_category_id is null or b.category_id = in_category_id)
    and st_dwithin(b.geo,
                   st_setsrid(st_point(in_lng,in_lat),4326)::geography,
                   in_radius_km * 1000)
    and not exists (
      select 1
      from public.served_matches sm
      where sm.viewer_msisdn = viewer_msisdn
        and sm.kind = 'business'
        and sm.target_pk = b.id::text
    )
  order by b.created_at desc, distance_km asc
  limit greatest(in_max,1);
$$;
