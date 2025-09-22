-- Create POS sync log table
CREATE TABLE pos_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid REFERENCES businesses(id),
  sync_type text NOT NULL,
  items_processed integer DEFAULT 0,
  items_updated integer DEFAULT 0,
  items_failed integer DEFAULT 0,
  sync_details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add POS sync fields to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sku text,
ADD COLUMN IF NOT EXISTS min_stock_level integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS last_pos_sync timestamptz;

-- Create index for faster POS lookups
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_business_stock ON products(business_id, stock_quantity);

-- Add POS system config to businesses
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS pos_system_config jsonb;

-- Enable RLS
ALTER TABLE pos_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for POS sync log
CREATE POLICY "Bar staff can view sync logs" 
ON pos_sync_log FOR SELECT 
USING (is_bar_staff(bar_id));

CREATE POLICY "System can insert sync logs" 
ON pos_sync_log FOR INSERT 
WITH CHECK (true);

-- Set up cron job for automatic sync every 30 seconds
SELECT cron.schedule(
  'pos-sync-all-bars',
  '*/30 * * * * *', -- every 30 seconds
  $$
  SELECT net.http_post(
    url := 'https://ijblirphkrrsnxazohwt.supabase.co/functions/v1/pos-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqYmxpcnBoa3Jyc254YXpvaHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NDAzMzAsImV4cCI6MjA2ODIxNjMzMH0.gH-rvhmX1RvQSlgwbjqq15bHBgKmlDRkAGyfzFyEeKs"}'::jsonb,
    body := '{"action": "sync_all_bars"}'::jsonb
  ) as request_id;
  $$
);