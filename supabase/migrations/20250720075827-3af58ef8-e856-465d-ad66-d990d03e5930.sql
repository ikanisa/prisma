-- Admin helper to forcibly mark a trip as matched
CREATE OR REPLACE FUNCTION fn_admin_force_match(p_trip_id uuid)
RETURNS void
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
  -- Try to update in driver_trips_spatial first
  UPDATE driver_trips_spatial 
  SET status = 'matched', updated_at = now()
  WHERE id = p_trip_id;
  
  -- If no rows affected, try passenger_intents_spatial
  IF NOT FOUND THEN
    UPDATE passenger_intents_spatial 
    SET status = 'matched', updated_at = now()
    WHERE id = p_trip_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_admin_force_match TO authenticated;