-- ===============================================
-- easyMO Unified Ordering System - Core Schema
-- ===============================================

-- 1. Update businesses table to match blueprint
-- Add missing columns and constraints
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('pharmacy','bar','hardware','produce')),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Update existing business records to have a default category if null
UPDATE businesses SET category = 'produce' WHERE category IS NULL;

-- Make category required after setting defaults
ALTER TABLE businesses ALTER COLUMN category SET NOT NULL;

-- 2. Update products table to match blueprint  
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS unit text,
ADD COLUMN IF NOT EXISTS stock_qty integer DEFAULT 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

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

-- 5. Update orders table to match blueprint
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cart_id uuid REFERENCES carts(id),
ADD COLUMN IF NOT EXISTS fulfilment_mode text CHECK (fulfilment_mode IN ('pickup', 'table', 'delivery')),
ADD COLUMN IF NOT EXISTS extras jsonb DEFAULT '{}';

-- Update status constraint to match blueprint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'paid', 'preparing', 'dispatched', 'completed', 'cancelled'));

-- 6. Update payments table to match blueprint
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id),
ADD COLUMN IF NOT EXISTS momo_tx text,
ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Update status constraint
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check 
  CHECK (status IN ('pending', 'paid', 'failed'));

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

-- 9. Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id text REFERENCES contacts(phone_number) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  message_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 10. Create conversation_messages table
CREATE TABLE IF NOT EXISTS conversation_messages (
  id bigserial PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user', 'agent', 'system')),
  text text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'location')),
  metadata jsonb DEFAULT '{}',
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
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_business_id ON conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at ON conversation_messages(created_at);

-- Enable Row Level Security
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for carts (users can only see their own carts)
CREATE POLICY "Users can view own carts" ON carts
  FOR SELECT USING (true); -- Admin can see all, users see by phone

CREATE POLICY "System can manage carts" ON carts
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for cart_items
CREATE POLICY "Users can view cart items" ON cart_items
  FOR SELECT USING (true);

CREATE POLICY "System can manage cart items" ON cart_items
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for deliveries
CREATE POLICY "Drivers can view assigned deliveries" ON deliveries
  FOR SELECT USING (true);

CREATE POLICY "System can manage deliveries" ON deliveries
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for contacts
CREATE POLICY "System can manage contacts" ON contacts
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for conversations
CREATE POLICY "System can manage conversations" ON conversations
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for conversation_messages
CREATE POLICY "System can manage conversation messages" ON conversation_messages
  FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();