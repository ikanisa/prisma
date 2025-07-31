-- Part 1: Unified Marketplace Backend Schema (Fixed)
-- Creating the core tables for the channel-agnostic ordering system

-- Carts table - universal to all vendor types (skip if exists)
CREATE TABLE IF NOT EXISTS carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_phone text NOT NULL,
  vendor_id uuid REFERENCES businesses(id),
  status text CHECK (status IN ('open','paid','abandoned')) DEFAULT 'open',
  total numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Cart items table (skip if exists)
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid REFERENCES carts(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  qty integer NOT NULL CHECK (qty > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  created_at timestamptz DEFAULT now()
);

-- Orders table - handles all vendor types (skip if exists)
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid REFERENCES carts(id),
  status text CHECK (status IN ('pending','paid','dispatched','completed','cancelled')) DEFAULT 'pending',
  fulfilment_mode text, -- pickup / table / delivery
  delivery_address text,
  extras jsonb DEFAULT '{}', -- {table:"5", note:"no ice", prescription_url:"..."}
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payments table (skip if exists)
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  momo_tx text,
  status text CHECK (status IN ('pending','success','failed')) DEFAULT 'pending',
  amount integer NOT NULL CHECK (amount > 0),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Deliveries table - driver/courier shared table (skip if exists)
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  driver_id uuid,
  mode text, -- moto / rider / waiter
  status text CHECK (status IN ('assigned','picked','delivered')) DEFAULT 'assigned',
  pickup_eta timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables (skip if already enabled)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'carts' AND relrowsecurity = true) THEN
    ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'cart_items' AND relrowsecurity = true) THEN
    ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'orders' AND relrowsecurity = true) THEN
    ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'payments' AND relrowsecurity = true) THEN
    ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'deliveries' AND relrowsecurity = true) THEN
    ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist to recreate with proper naming
DROP POLICY IF EXISTS "Admin can manage all carts" ON carts;
DROP POLICY IF EXISTS "System can manage carts" ON carts;
DROP POLICY IF EXISTS "Admin can manage all cart items" ON cart_items;
DROP POLICY IF EXISTS "System can manage cart items" ON cart_items;

-- Create unified RLS policies for the marketplace system

-- Carts policies
CREATE POLICY "unified_carts_system_access" 
ON carts FOR ALL 
USING (true)
WITH CHECK (true);

-- Cart items policies  
CREATE POLICY "unified_cart_items_system_access" 
ON cart_items FOR ALL 
USING (true)
WITH CHECK (true);

-- Orders policies
CREATE POLICY "unified_orders_system_access" 
ON orders FOR ALL 
USING (true)
WITH CHECK (true);

-- Payments policies
CREATE POLICY "unified_payments_system_access" 
ON payments FOR ALL 
USING (true)
WITH CHECK (true);

-- Deliveries policies
CREATE POLICY "unified_deliveries_system_access" 
ON deliveries FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_carts_buyer_phone ON carts(buyer_phone);
CREATE INDEX IF NOT EXISTS idx_carts_vendor_id ON carts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts(status);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_cart_id ON orders(cart_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_id ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

-- Create trigger for updating cart totals
CREATE OR REPLACE FUNCTION update_cart_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE carts 
  SET total = (
    SELECT COALESCE(SUM(qty * unit_price), 0)
    FROM cart_items 
    WHERE cart_id = COALESCE(NEW.cart_id, OLD.cart_id)
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.cart_id, OLD.cart_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update cart total when cart items change
DROP TRIGGER IF EXISTS trigger_update_cart_total ON cart_items;
CREATE TRIGGER trigger_update_cart_total
  AFTER INSERT OR UPDATE OR DELETE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_total();

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_unified_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
DROP TRIGGER IF EXISTS trigger_carts_updated_at ON carts;
CREATE TRIGGER trigger_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW
  EXECUTE FUNCTION update_unified_timestamps();

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_unified_timestamps();

DROP TRIGGER IF EXISTS trigger_deliveries_updated_at ON deliveries;
CREATE TRIGGER trigger_deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_unified_timestamps();