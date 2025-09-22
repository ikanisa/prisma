-- Backfill existing orders to unified schema
-- This migration moves existing vertical-specific orders to unified tables

-- First, create a comprehensive backfill function
CREATE OR REPLACE FUNCTION backfill_unified_orders()
RETURNS TABLE (
  orders_migrated INTEGER,
  carts_created INTEGER,
  payments_migrated INTEGER,
  deliveries_created INTEGER,
  migration_summary TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  orders_count INTEGER := 0;
  carts_count INTEGER := 0;
  payments_count INTEGER := 0;
  deliveries_count INTEGER := 0;
  summary_text TEXT;
BEGIN
  -- Migrate pharmacy orders to unified orders
  INSERT INTO orders (
    id,
    cart_id,
    user_id,
    total_price,
    delivery_fee,
    status,
    fulfilment_mode,
    items,
    created_at,
    extras
  )
  SELECT 
    po.id,
    NULL, -- cart_id will be generated below
    (SELECT user_id FROM pharmacy_shoppers WHERE id = po.shopper_id),
    po.total_amount,
    po.delivery_fee,
    CASE 
      WHEN po.status = 'pending' THEN 'pending'::order_status
      WHEN po.status = 'confirmed' THEN 'confirmed'::order_status
      WHEN po.status = 'ready' THEN 'ready'::order_status
      WHEN po.status = 'delivered' THEN 'delivered'::order_status
      ELSE 'pending'::order_status
    END,
    'delivery',
    jsonb_build_object(
      'vertical', 'pharmacy',
      'shopper_id', po.shopper_id,
      'pharmacy_id', po.pharmacy_id
    ),
    po.created_at,
    jsonb_build_object(
      'delivery_address', po.delivery_address,
      'special_instructions', po.special_instructions
    )
  FROM pharmacy_orders po
  WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.id = po.id
  );
  
  GET DIAGNOSTICS orders_count = ROW_COUNT;

  -- Create carts for migrated pharmacy orders
  INSERT INTO carts (
    id,
    buyer_phone,
    vendor_id,
    total,
    status,
    created_at
  )
  SELECT 
    gen_random_uuid(),
    ps.whatsapp_number,
    po.pharmacy_id,
    po.total_amount,
    'converted',
    po.created_at
  FROM pharmacy_orders po
  JOIN pharmacy_shoppers ps ON ps.id = po.shopper_id
  WHERE NOT EXISTS (
    SELECT 1 FROM carts c 
    JOIN orders o ON o.cart_id = c.id 
    WHERE o.id = po.id
  );

  GET DIAGNOSTICS carts_count = ROW_COUNT;

  -- Migrate bar tabs to unified orders
  INSERT INTO orders (
    id,
    cart_id,
    user_id, 
    total_price,
    status,
    fulfilment_mode,
    items,
    created_at,
    extras
  )
  SELECT 
    bt.id,
    NULL,
    (SELECT user_id FROM bar_patrons WHERE id = bt.patron_id),
    bt.total,
    CASE 
      WHEN bt.status = 'open' THEN 'pending'::order_status
      WHEN bt.status = 'closed' THEN 'delivered'::order_status
      ELSE 'pending'::order_status
    END,
    'dine_in',
    jsonb_build_object(
      'vertical', 'bar',
      'table_code', bt.table_code,
      'patron_id', bt.patron_id,
      'tip', bt.tip,
      'subtotal', bt.subtotal
    ),
    bt.created_at,
    jsonb_build_object(
      'bar_id', bt.bar_id,
      'table_code', bt.table_code
    )
  FROM bar_tabs bt
  WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.id = bt.id
  );

  -- Migrate existing payments to unified payments table
  INSERT INTO payments (
    id,
    order_id,
    user_id,
    amount,
    momo_code,
    ussd_code,
    status,
    paid_at,
    created_at
  )
  SELECT 
    gen_random_uuid(),
    o.id,
    o.user_id,
    o.total_price,
    'default_momo',
    'default_ussd',
    CASE 
      WHEN o.status = 'delivered' THEN 'completed'::payment_status
      WHEN o.status = 'confirmed' THEN 'completed'::payment_status
      ELSE 'pending'::payment_status
    END,
    CASE 
      WHEN o.status IN ('delivered', 'confirmed') THEN o.created_at + interval '30 minutes'
      ELSE NULL
    END,
    o.created_at
  FROM orders o
  WHERE NOT EXISTS (
    SELECT 1 FROM payments p WHERE p.order_id = o.id
  )
  AND o.total_price > 0;

  GET DIAGNOSTICS payments_count = ROW_COUNT;

  -- Create deliveries for orders requiring delivery
  INSERT INTO deliveries (
    id,
    order_id,
    status,
    mode,
    created_at
  )
  SELECT 
    gen_random_uuid(),
    o.id,
    CASE 
      WHEN o.status = 'delivered' THEN 'delivered'
      WHEN o.status = 'ready' THEN 'in_transit'
      WHEN o.status = 'confirmed' THEN 'assigned'
      ELSE 'pending'
    END,
    CASE 
      WHEN o.fulfilment_mode = 'delivery' THEN 'motorcycle'
      WHEN o.fulfilment_mode = 'pickup' THEN 'pickup'
      ELSE 'motorcycle'
    END,
    o.created_at
  FROM orders o
  WHERE o.fulfilment_mode IN ('delivery', 'pickup')
  AND NOT EXISTS (
    SELECT 1 FROM deliveries d WHERE d.order_id = o.id
  );

  GET DIAGNOSTICS deliveries_count = ROW_COUNT;

  -- Generate summary
  summary_text := format(
    'Migration completed: %s orders, %s carts, %s payments, %s deliveries',
    orders_count, carts_count, payments_count, deliveries_count
  );

  RETURN QUERY SELECT 
    orders_count, 
    carts_count, 
    payments_count, 
    deliveries_count, 
    summary_text;
END;
$$;

-- Set VERTICAL_CATEGORIES environment variable simulation via database config
CREATE TABLE IF NOT EXISTS edge_function_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(function_name, config_key)
);

-- Enable RLS on config table
ALTER TABLE edge_function_config ENABLE ROW LEVEL SECURITY;

-- Admin-only access to config
CREATE POLICY "Admin manage config" ON edge_function_config
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Insert VERTICAL_CATEGORIES configuration
INSERT INTO edge_function_config (function_name, config_key, config_value)
VALUES 
  ('unified-marketplace', 'VERTICAL_CATEGORIES', 'pharmacy,bar,hardware,produce'),
  ('cart-handler', 'VERTICAL_CATEGORIES', 'pharmacy,bar,hardware,produce'),
  ('checkout-link', 'VERTICAL_CATEGORIES', 'pharmacy,bar,hardware,produce'),
  ('driver-assign', 'VERTICAL_CATEGORIES', 'pharmacy,bar,hardware,produce')
ON CONFLICT (function_name, config_key) 
DO UPDATE SET config_value = EXCLUDED.config_value;

-- Create CSAT tracking table for MarketingAgent gating
CREATE TABLE IF NOT EXISTS customer_satisfaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID,
  phone_number TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  vertical TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE customer_satisfaction ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admin read CSAT" ON customer_satisfaction
  FOR SELECT USING (is_admin());

CREATE POLICY "System manage CSAT" ON customer_satisfaction
  FOR ALL USING (true) WITH CHECK (true);

-- Create marketing eligibility function
CREATE OR REPLACE FUNCTION is_marketing_eligible()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  avg_csat NUMERIC;
  min_responses INTEGER := 10; -- Minimum responses required
  response_count INTEGER;
BEGIN
  -- Get recent CSAT data (last 30 days)
  SELECT 
    AVG(rating),
    COUNT(*)
  INTO avg_csat, response_count
  FROM customer_satisfaction 
  WHERE created_at >= NOW() - INTERVAL '30 days';
  
  -- Require minimum responses and CSAT > 4.2
  RETURN (response_count >= min_responses AND avg_csat > 4.2);
END;
$$;

-- Create marketing gate log table
CREATE TABLE IF NOT EXISTS marketing_gate_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_time TIMESTAMPTZ DEFAULT NOW(),
  avg_csat NUMERIC,
  response_count INTEGER,
  gate_passed BOOLEAN,
  marketing_enabled BOOLEAN
);

-- Enable RLS
ALTER TABLE marketing_gate_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read marketing_gate_log" ON marketing_gate_log
  FOR SELECT USING (is_admin());

CREATE POLICY "System write marketing_gate_log" ON marketing_gate_log
  FOR INSERT WITH CHECK (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_csat_created_at ON customer_satisfaction(created_at);
CREATE INDEX IF NOT EXISTS idx_csat_rating ON customer_satisfaction(rating);
CREATE INDEX IF NOT EXISTS idx_csat_vertical ON customer_satisfaction(vertical);