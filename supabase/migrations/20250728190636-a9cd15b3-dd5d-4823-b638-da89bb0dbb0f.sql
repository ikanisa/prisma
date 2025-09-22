-- Fix migration by dropping dependent policies first, then simplifying for USSD-only payments

-- Drop all existing payment policies first
DROP POLICY IF EXISTS "payments_users_update_own" ON payments;
DROP POLICY IF EXISTS "payments_users_view_own" ON payments;
DROP POLICY IF EXISTS "payments_admin_access" ON payments;
DROP POLICY IF EXISTS "payments_system_access" ON payments;

-- Drop payment_events table since we don't need status tracking
DROP TABLE IF EXISTS payment_events;

-- Now safely modify payments table structure
ALTER TABLE payments 
DROP COLUMN IF EXISTS status CASCADE,
DROP COLUMN IF EXISTS confirmed_at CASCADE,
DROP COLUMN IF EXISTS payment_method CASCADE,
DROP COLUMN IF EXISTS notes CASCADE;

-- Add simple USSD fields
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS ussd_code TEXT,
ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT 'general';

-- Create simplified RLS policies
CREATE POLICY "payments_admin_full_access" ON payments
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "payments_system_insert" ON payments
    FOR INSERT WITH CHECK (true);

-- Update the payments_insert function for USSD payments
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