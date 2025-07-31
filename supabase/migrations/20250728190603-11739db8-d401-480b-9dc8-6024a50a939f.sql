-- Simplify payments system for USSD-only (no API integration, no status tracking)

-- Drop payment_events table since we don't need status tracking
DROP TABLE IF EXISTS payment_events;

-- Simplify payments table to just log QR code generation
ALTER TABLE payments 
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS confirmed_at,
DROP COLUMN IF EXISTS payment_method,
DROP COLUMN IF EXISTS notes;

-- Add simple USSD code field
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS ussd_code TEXT,
ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT 'general';

-- Update RLS policies to be simpler (no status-based restrictions)
DROP POLICY IF EXISTS "payment_events_admin_access" ON payment_events;
DROP POLICY IF EXISTS "payment_events_system_access" ON payment_events;

-- Update payments policies
DROP POLICY IF EXISTS "payments_admin_access" ON payments;
DROP POLICY IF EXISTS "payments_system_access" ON payments;

CREATE POLICY "payments_admin_full_access" ON payments
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "payments_system_insert" ON payments
    FOR INSERT WITH CHECK (true);

-- Simplify the payments_insert function
CREATE OR REPLACE FUNCTION payments_insert(
    p_user_id TEXT DEFAULT NULL,
    p_amount INTEGER DEFAULT NULL,
    p_momo_number TEXT DEFAULT NULL,
    p_qr_url TEXT DEFAULT NULL,
    p_ref TEXT DEFAULT NULL,
    p_ussd_code TEXT DEFAULT NULL,
    p_purpose TEXT DEFAULT 'general'
) RETURNS UUID AS $$
DECLARE
    payment_id UUID;
BEGIN
    INSERT INTO payments (
        user_id, 
        direction, 
        amount, 
        momo_number, 
        qr_url, 
        ref,
        ussd_code,
        purpose
    ) VALUES (
        p_user_id,
        'inbound',
        p_amount,
        p_momo_number,
        p_qr_url,
        p_ref,
        p_ussd_code,
        p_purpose
    ) RETURNING id INTO payment_id;
    
    RETURN payment_id;
END;
$$ LANGUAGE plpgsql;

-- Remove payments_mark_paid function since we don't track status
DROP FUNCTION IF EXISTS payments_mark_paid;