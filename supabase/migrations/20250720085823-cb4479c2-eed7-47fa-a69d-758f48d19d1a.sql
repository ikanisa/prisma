-- =========================================
--  Add missing check constraints only
-- =========================================
DO $$ 
BEGIN
    -- Check constraints for driver_trips_spatial
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'check_price_positive') THEN
        ALTER TABLE public.driver_trips_spatial ADD CONSTRAINT check_price_positive CHECK (price_rwf > 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'check_seats_positive') THEN
        ALTER TABLE public.driver_trips_spatial ADD CONSTRAINT check_seats_positive CHECK (seats >= 1);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'driver_trips_status_valid') THEN
        ALTER TABLE public.driver_trips_spatial ADD CONSTRAINT driver_trips_status_valid CHECK (status IN ('active', 'completed', 'cancelled'));
    END IF;
    
    -- Check constraints for passenger_intents_spatial  
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'check_seats_needed_positive') THEN
        ALTER TABLE public.passenger_intents_spatial ADD CONSTRAINT check_seats_needed_positive CHECK (seats_needed >= 1);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'passenger_intents_status_valid') THEN
        ALTER TABLE public.passenger_intents_spatial ADD CONSTRAINT passenger_intents_status_valid CHECK (status IN ('open', 'matched', 'cancelled'));
    END IF;
    
    -- Check constraints for bookings_spatial
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'bookings_status_valid') THEN
        ALTER TABLE public.bookings_spatial ADD CONSTRAINT bookings_status_valid CHECK (status IN ('pending', 'confirmed', 'cancelled'));
    END IF;
END $$;