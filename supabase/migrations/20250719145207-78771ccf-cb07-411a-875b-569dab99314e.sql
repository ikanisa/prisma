-- Fix farmer table column names to match UI expectations
ALTER TABLE farmers RENAME COLUMN phone TO whatsapp;
ALTER TABLE farmers RENAME COLUMN location TO district;

-- Ensure we have the right column names for farmers table
-- Current: id, name, whatsapp, district, status, listings_count, created_at

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

-- Set up cron job for matchmaker (runs every 15 minutes)
SELECT cron.schedule(
    'matchmaker-every-15min',
    '*/15 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://ijblirphkrrsnxazohwt.supabase.co/functions/v1/matchmaker',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqYmxpcnBoa3Jyc254YXpvaHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NDAzMzAsImV4cCI6MjA2ODIxNjMzMH0.gH-rvhmX1RvQSlgwbjqq15bHBgKmlDRkAGyfzFyEeKs"}'::jsonb,
        body := '{"trigger": "cron"}'::jsonb
    );
    $$
);