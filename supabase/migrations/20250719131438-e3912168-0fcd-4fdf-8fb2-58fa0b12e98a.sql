-- ===============================================
-- easyMO Unified Ordering System - Part 2a: Table Structure Updates
-- ===============================================

-- 1. Update existing business records and add status column
UPDATE businesses SET category = 'produce' WHERE category IS NULL;

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 2. Update products table structure first
-- Rename farmer_id to business_id for consistency
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'farmer_id') THEN
        ALTER TABLE products RENAME COLUMN farmer_id TO business_id;
    END IF;
END $$;

-- Add missing columns to products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS category text;

-- Add unit column if it doesn't exist (avoiding duplicate)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'unit') THEN
        ALTER TABLE products ADD COLUMN unit text;
    END IF;
END $$;

-- Rename stock to stock_qty for consistency
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'stock') THEN
        ALTER TABLE products RENAME COLUMN stock TO stock_qty;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 5. Update orders table to match blueprint
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS fulfilment_mode text CHECK (fulfilment_mode IN ('pickup', 'table', 'delivery')),
ADD COLUMN IF NOT EXISTS extras jsonb DEFAULT '{}';

-- 6. Update payments table to match blueprint
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS momo_tx text,
ADD COLUMN IF NOT EXISTS paid_at timestamptz;