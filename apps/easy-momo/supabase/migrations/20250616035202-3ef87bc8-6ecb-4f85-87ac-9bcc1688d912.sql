
-- Add missing scanned_code column to existing transactions table
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS scanned_code text NOT NULL DEFAULT '';

-- Update the table to ensure it has all required columns for the QR scanner
-- The table should now have: id, scanned_code, scanned_at, launched_ussd, payment_status, payer_number, session_id, payment_id
