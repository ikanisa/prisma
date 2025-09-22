-- Add missing columns to products table first
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sku text,
ADD COLUMN IF NOT EXISTS min_stock_level integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS last_pos_sync timestamptz;

-- Create POS sync log table
CREATE TABLE IF NOT EXISTS pos_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid REFERENCES businesses(id),
  sync_type text NOT NULL,
  items_processed integer DEFAULT 0,
  items_updated integer DEFAULT 0,
  items_failed integer DEFAULT 0,
  sync_details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for faster POS lookups
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_business_stock ON products(business_id, stock_quantity);

-- Add POS system config to businesses
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS pos_system_config jsonb;

-- Enable RLS
ALTER TABLE pos_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for POS sync log
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pos_sync_log' 
    AND policyname = 'Bar staff can view sync logs'
  ) THEN
    CREATE POLICY "Bar staff can view sync logs" 
    ON pos_sync_log FOR SELECT 
    USING (is_bar_staff(bar_id));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pos_sync_log' 
    AND policyname = 'System can insert sync logs'
  ) THEN
    CREATE POLICY "System can insert sync logs" 
    ON pos_sync_log FOR INSERT 
    WITH CHECK (true);
  END IF;
END $$;