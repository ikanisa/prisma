-- served_contacts: prevent re-showing a target to the same viewer quickly
create table if not exists public.served_contacts (
  id bigserial primary key,
  viewer_user uuid not null,
  target_user uuid not null,
  role text not null check (role in ('driver','passenger')),
  created_at timestamptz default now(),
  unique (viewer_user, target_user, role)
);
alter table public.served_contacts enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename='served_contacts') then
    create policy no_public_served on public.served_contacts for all using (false);
  end if;
end$$;

-- Nearby drivers with distance (km)
create or replace function public.nearby_drivers_with_distance(
  in_lat double precision,
  in_lng double precision,
  in_vehicle_type text,
  in_radius_km numeric,
  in_max integer
) returns table (
  user_id uuid,
  whatsapp_e164 text,
  last_seen timestamptz,
  distance_km numeric
) language sql stable as $$
  select d.user_id, p.whatsapp_e164, d.last_seen,
         round( st_distance_sphere(
           d.location::geometry,
           st_setsrid(st_makepoint(in_lng, in_lat),4326)
         ) / 1000.0 , 2) as distance_km
  from driver_status d
  join profiles p on p.user_id = d.user_id
  where d.online = true
    and d.location is not null
    and (in_vehicle_type is null or d.vehicle_type = in_vehicle_type)
    and st_dwithin(
      d.location::geography,
      st_setsrid(st_makepoint(in_lng, in_lat),4326),
      in_radius_km * 1000
    )
  order by d.last_seen desc
  limit greatest(in_max,1);
$$;

-- Nearby passengers (open trips) with distance (km)
create or replace function public.nearby_passengers_with_distance(
  in_lat double precision,
  in_lng double precision,
  in_vehicle_type text,
  in_radius_km numeric,
  in_max integer
) returns table (
  user_id uuid,
  whatsapp_e164 text,
  created_at timestamptz,
  distance_km numeric
) language sql stable as $$
  select t.user_id, p.whatsapp_e164, t.created_at,
         round( st_distance_sphere(
           t.pickup::geometry,
           st_setsrid(st_makepoint(in_lng, in_lat),4326)
         ) / 1000.0 , 2) as distance_km
  from trips t
  join profiles p on p.user_id = t.user_id
  where t.status = 'open'
    and t.pickup is not null
    and (in_vehicle_type is null or t.vehicle_type = in_vehicle_type)
    and st_dwithin(
      t.pickup::geography,
      st_setsrid(st_makepoint(in_lng, in_lat),4326),
      in_radius_km * 1000
    )
  order by t.created_at desc
  limit greatest(in_max,1);
$$;

-- Nearby businesses with distance (km); category optional (pass null for all)
create or replace function public.nearby_businesses_with_distance(
  in_lat double precision,
  in_lng double precision,
  in_category_id bigint,
  in_radius_km numeric,
  in_max integer
) returns table (
  id bigint,
  name text,
  whatsapp_e164 text,
  distance_km numeric
) language sql stable as $$
  select b.id, b.name, b.whatsapp_e164,
         round( st_distance_sphere(
           b.location::geometry,
           st_setsrid(st_makepoint(in_lng, in_lat),4326)
         ) / 1000.0 , 2) as distance_km
  from businesses b
  where b.location is not null
    and (in_category_id is null or b.category_id = in_category_id)
    and st_dwithin(
      b.location::geography,
      st_setsrid(st_makepoint(in_lng, in_lat),4326),
      in_radius_km * 1000
    )
  order by b.created_at desc
  limit greatest(in_max,1);
$$;
