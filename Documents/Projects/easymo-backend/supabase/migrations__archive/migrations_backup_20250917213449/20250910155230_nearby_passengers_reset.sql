do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'nearby_passengers'
      and pg_get_function_identity_arguments(p.oid) = 'double precision, double precision, text, integer'
  ) then
    drop function public.nearby_passengers(double precision, double precision, text, int);
  end if;
end$$;

create or replace function public.nearby_passengers(
  _lat double precision,
  _lon double precision,
  _viewer text,
  _limit int
)
returns table(
  trip_id uuid,
  creator_user_id uuid,
  distance_km numeric,
  created_at timestamptz,
  whatsapp_e164 text
)
language sql
stable
as $$
  select
    t.id as trip_id,
    t.creator_user_id,
    (st_distance(
       t.pickup,
       st_setsrid(st_point(_lon,_lat), 4326)::geography
     ) / 1000.0)::numeric as distance_km,
    t.created_at,
    p.whatsapp_e164
  from public.trips t
  join public.profiles p on p.user_id = t.creator_user_id
  where t.role = 'passenger'
    and t.status = 'open'
    and t.pickup is not null
    and not exists (
      select 1
      from public.served_passengers sp
      where sp.viewer_driver_msisdn = _viewer
        and sp.passenger_trip_id = t.id
        and sp.expires_at > now()
    )
  order by distance_km asc, t.created_at desc
  limit greatest(1, coalesce(_limit, 10));
$$;

grant execute on function public.nearby_passengers(double precision, double precision, text, int)
  to anon, authenticated;
