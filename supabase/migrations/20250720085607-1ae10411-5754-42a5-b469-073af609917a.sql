-- =========================================
--  MISSING: Auto-update triggers for updated_at
-- =========================================
CREATE OR REPLACE FUNCTION public.set_updated_at() 
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add triggers to spatial tables
CREATE TRIGGER driver_trips_spatial_updated
  BEFORE UPDATE ON public.driver_trips_spatial
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER passenger_intents_spatial_updated
  BEFORE UPDATE ON public.passenger_intents_spatial
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER bookings_spatial_updated
  BEFORE UPDATE ON public.bookings_spatial
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- =========================================
--  MISSING: Check constraints for data validation
-- =========================================
ALTER TABLE public.driver_trips_spatial 
ADD CONSTRAINT check_price_positive CHECK (price_rwf > 0);

ALTER TABLE public.driver_trips_spatial 
ADD CONSTRAINT check_seats_positive CHECK (seats >= 1);

ALTER TABLE public.driver_trips_spatial 
ADD CONSTRAINT check_status_valid CHECK (status IN ('active', 'completed', 'cancelled'));

ALTER TABLE public.passenger_intents_spatial 
ADD CONSTRAINT check_seats_needed_positive CHECK (seats_needed >= 1);

ALTER TABLE public.passenger_intents_spatial 
ADD CONSTRAINT check_status_valid CHECK (status IN ('open', 'matched', 'cancelled'));

ALTER TABLE public.bookings_spatial 
ADD CONSTRAINT check_status_valid CHECK (status IN ('pending', 'confirmed', 'cancelled'));