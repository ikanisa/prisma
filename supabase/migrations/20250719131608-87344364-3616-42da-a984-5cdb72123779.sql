-- ===============================================
-- easyMO Unified Ordering System - Part 2c: Core Tables (Step by Step)
-- ===============================================

-- 3. Create carts table for shopping cart functionality
CREATE TABLE IF NOT EXISTS carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_phone text NOT NULL,
  vendor_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  status text DEFAULT 'open' CHECK (status IN ('open', 'paid', 'abandoned')),
  total numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid REFERENCES carts(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  qty integer NOT NULL CHECK (qty > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  created_at timestamptz DEFAULT now()
);

-- Add cart_id to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cart_id uuid REFERENCES carts(id);

-- Add order_id to payments table  
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id);

-- 7. Create deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES drivers(id),
  mode text CHECK (mode IN ('moto', 'waiter', 'courier')),
  status text DEFAULT 'assigned' CHECK (status IN ('assigned', 'picked_up', 'in_transit', 'delivered', 'failed')),
  pickup_eta timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. Create contacts table for WhatsApp integration
CREATE TABLE IF NOT EXISTS contacts (
  phone_number text PRIMARY KEY,
  name text,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  preferred_lang text DEFAULT 'en',
  total_orders integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_carts_buyer_phone ON carts(buyer_phone);
CREATE INDEX IF NOT EXISTS idx_carts_vendor_id ON carts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts(status);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_id ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);