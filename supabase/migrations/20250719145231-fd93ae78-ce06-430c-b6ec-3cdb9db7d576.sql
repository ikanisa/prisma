-- Fix farmer table column names to match UI expectations
ALTER TABLE farmers RENAME COLUMN phone TO whatsapp;
ALTER TABLE farmers RENAME COLUMN location TO district;

-- Add missing columns if they don't exist
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS crops text[];

-- Add trigger to update farmer listings count when produce_listings change
CREATE OR REPLACE FUNCTION update_farmer_listings_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE farmers 
        SET listings_count = listings_count + 1 
        WHERE id = NEW.farmer_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE farmers 
        SET listings_count = GREATEST(0, listings_count - 1) 
        WHERE id = OLD.farmer_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER farmer_listings_count_trigger
    AFTER INSERT OR DELETE ON produce_listings
    FOR EACH ROW
    EXECUTE FUNCTION update_farmer_listings_count();