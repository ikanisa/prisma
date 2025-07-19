-- Create unified trips and intents view for admin dashboard
CREATE OR REPLACE VIEW public.trips_and_intents AS
SELECT  
    dt.id,
    'driver_trip'::text as type,
    dt.driver_id::text as user_phone,
    ST_AsText(dt.origin) as from_text,
    ST_AsText(dt.destination) as to_text, 
    dt.price_rwf,
    dt.seats,
    dt.status,
    dt.created_at,
    dt.updated_at
FROM public.driver_trips dt
UNION ALL
SELECT  
    pi.id,
    'passenger_intent'::text as type,
    pi.passenger_phone as user_phone,
    ST_AsText(pi.pickup) as from_text,
    ST_AsText(pi.dropoff) as to_text,
    NULL::integer as price_rwf,
    pi.seats as seats,
    pi.status,
    pi.created_at, 
    pi.updated_at
FROM public.passenger_intents pi;

-- Grant access to the view
GRANT SELECT ON public.trips_and_intents TO authenticated, anon;

-- Admin helper function to force match a trip
CREATE OR REPLACE FUNCTION public.fn_admin_force_match(p_trip_id uuid)
RETURNS void
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.driver_trips 
  SET status = 'matched', updated_at = now()
  WHERE id = p_trip_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_force_match TO authenticated;