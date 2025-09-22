-- Simple fix for products tables - just add what we need for basic functionality
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS category text DEFAULT 'hardware';

-- Fix farmers table column that still has old name
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farmers' AND column_name = 'phone') THEN
        ALTER TABLE farmers RENAME COLUMN phone TO whatsapp;
    END IF;
END
$$;