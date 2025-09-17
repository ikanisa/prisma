-- Drop the existing function with the same argument list if it exists,
-- so we can recreate it with our desired return columns/types.
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'nearby_drivers'
      and pg_get_function_identity_arguments(p.oid) = 'double precision, double precision, text, integer'
  ) then
    drop function public.nearby_drivers(double precision, double precision, text, int);
  end if;
end$$;

-- Recreate with the exact signature you want.
-- IMPORTANT: keep the return types generic (e.g., numeric) to avoid this problem later.
create function public.nearby_drivers(
  _lat double precision,
  _lon double precision,
  _viewer text,
  _limit int
)
returns table(
  driver_user_id uuid,
  whatsapp_e164 text,
  distance_km numeric,
  last_seen timestamptz
)
language sql
stable
as $$
  select
    d.user_id as driver_user_id,
    p.whatsapp_e164,
    (st_distance(
       d.location,
       st_setsrid(st_point(_lon,_lat), 4326)::geography
     ) / 1000.0)::numeric as distance_km,
    d.last_seen
  from public.driver_status d
  join public.profiles p on p.user_id = d.user_id
  where d.online = true
    and d.location is not null
    and not exists (
      select 1
      from public.served_drivers sd
      where sd.viewer_passenger_msisdn = _viewer
        and sd.driver_user_id = d.user_id
        and sd.expires_at > now()
    )
  order by distance_km asc, d.last_seen desc
  limit greatest(1, coalesce(_limit, 10));
$$;

-- Optional: permissions for RPC use
grant execute on function public.nearby_drivers(double precision, double precision, text, int)
  to anon, authenticated;
