-- Create the fn_admin_force_match function
CREATE OR REPLACE FUNCTION public.fn_admin_force_match(p_trip_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update driver trip status to matched
  UPDATE driver_trips_spatial 
  SET status = 'matched', updated_at = now()
  WHERE id = p_trip_id;
  
  -- Update passenger intent status to matched 
  UPDATE passenger_intents_spatial 
  SET status = 'matched', updated_at = now()
  WHERE id = p_trip_id;
END;
$$;

-- Create the unified view for trips and intents
CREATE OR REPLACE VIEW trips_and_intents_spatial AS
SELECT 
  id,
  'driver_trip'::text as type,
  driver_phone as user_phone,
  from_text,
  to_text,
  price_rwf,
  seats,
  status,
  created_at,
  updated_at,
  origin,
  destination,
  metadata
FROM driver_trips_spatial
UNION ALL
SELECT 
  id,
  'passenger_intent'::text as type,
  passenger_phone as user_phone,
  from_text,
  to_text,
  max_price_rwf as price_rwf,
  seats_needed as seats,
  status,
  created_at,
  updated_at,
  pickup as origin,
  dropoff as destination,
  metadata
FROM passenger_intents_spatial;

-- Grant permissions
GRANT SELECT ON trips_and_intents_spatial TO authenticated, anon;
GRANT EXECUTE ON FUNCTION fn_admin_force_match TO authenticated;