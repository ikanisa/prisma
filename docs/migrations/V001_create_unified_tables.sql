-- V001: Create Unified Tables for easyMO Consolidation
-- This migration creates the unified table structure as defined in the refactor proposal
-- without dropping existing tables to maintain backward compatibility

-- Enable PostGIS extension for spatial data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create enum types for unified tables
DO $$ BEGIN
  CREATE TYPE listing_type_enum AS ENUM ('product', 'produce', 'property', 'vehicle', 'hardware');
  EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE listing_status_enum AS ENUM ('active', 'inactive', 'sold', 'archived');
  EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE order_type_enum AS ENUM ('marketplace', 'produce', 'pharmacy', 'hardware', 'services');
  EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status_enum AS ENUM ('pending', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled', 'refunded');
  EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM ('pending', 'paid', 'failed', 'refunded');
  EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE channel_type_enum AS ENUM ('whatsapp', 'telegram', 'web', 'phone', 'email');
  EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE sender_type_enum AS ENUM ('user', 'agent', 'system', 'bot');
  EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_type_enum AS ENUM ('text', 'image', 'document', 'location', 'interactive');
  EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_status_enum AS ENUM ('sent', 'delivered', 'read', 'failed');
  EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create unified_listings table
CREATE TABLE IF NOT EXISTS unified_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_type listing_type_enum NOT NULL,
  title text NOT NULL,
  description text,
  price numeric(10,2),
  vendor_id uuid REFERENCES businesses(id),
  metadata jsonb DEFAULT '{}',
  location_gps geography(POINT, 4326), -- PostGIS geography type for GPS coordinates
  images text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  status listing_status_enum DEFAULT 'active',
  visibility text DEFAULT 'public',
  featured boolean DEFAULT false,
  stock_quantity integer,
  unit_of_measure text,
  category text,
  subcategory text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Create unified_orders table
CREATE TABLE IF NOT EXISTS unified_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_type order_type_enum NOT NULL,
  customer_phone text NOT NULL,
  customer_id uuid,
  vendor_id uuid REFERENCES businesses(id),
  items jsonb NOT NULL DEFAULT '[]',
  listing_ids uuid[] DEFAULT '{}',
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  delivery_fee numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'RWF',
  status order_status_enum DEFAULT 'pending',
  payment_status payment_status_enum DEFAULT 'pending',
  payment_method text,
  payment_reference text,
  delivery_method text,
  delivery_address text,
  delivery_notes text,
  domain_metadata jsonb DEFAULT '{}', -- Store domain-specific fields
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id text NOT NULL, -- Phone number or user identifier
  contact_phone text, -- Normalized phone number
  channel channel_type_enum NOT NULL DEFAULT 'whatsapp',
  thread_id text, -- Platform-specific thread identifier
  agent_id uuid REFERENCES agents(id),
  status text DEFAULT 'active',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type sender_type_enum NOT NULL,
  sender_id text, -- Phone number, agent ID, or system identifier
  content text NOT NULL,
  message_type message_type_enum DEFAULT 'text',
  metadata jsonb DEFAULT '{}',
  thread_id text, -- Platform-specific message thread
  reply_to_id uuid REFERENCES messages(id),
  status message_status_enum DEFAULT 'sent',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
-- Unified Listings indexes
CREATE INDEX IF NOT EXISTS idx_unified_listings_type ON unified_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_unified_listings_vendor ON unified_listings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_unified_listings_status ON unified_listings(status);
CREATE INDEX IF NOT EXISTS idx_unified_listings_location ON unified_listings USING GIST(location_gps);
CREATE INDEX IF NOT EXISTS idx_unified_listings_created ON unified_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_listings_price ON unified_listings(price);
CREATE INDEX IF NOT EXISTS idx_unified_listings_category ON unified_listings(category, subcategory);

-- Unified Orders indexes
CREATE INDEX IF NOT EXISTS idx_unified_orders_type ON unified_orders(order_type);
CREATE INDEX IF NOT EXISTS idx_unified_orders_customer ON unified_orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_unified_orders_vendor ON unified_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_unified_orders_status ON unified_orders(status);
CREATE INDEX IF NOT EXISTS idx_unified_orders_payment_status ON unified_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_unified_orders_created ON unified_orders(created_at DESC);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_contact ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(contact_phone);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);

-- Create unique constraints
ALTER TABLE conversations ADD CONSTRAINT IF NOT EXISTS unique_contact_channel 
  UNIQUE (contact_id, channel);

-- Enable Row Level Security
ALTER TABLE unified_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for unified_listings
CREATE POLICY IF NOT EXISTS "Admin can manage all listings" 
  ON unified_listings FOR ALL 
  USING (is_admin()) 
  WITH CHECK (is_admin());

CREATE POLICY IF NOT EXISTS "Vendors can manage own listings" 
  ON unified_listings FOR ALL 
  USING (vendor_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Public can view active listings" 
  ON unified_listings FOR SELECT 
  USING (status = 'active' AND visibility = 'public');

-- Create RLS policies for unified_orders
CREATE POLICY IF NOT EXISTS "Admin can manage all orders" 
  ON unified_orders FOR ALL 
  USING (is_admin()) 
  WITH CHECK (is_admin());

CREATE POLICY IF NOT EXISTS "Vendors can view own orders" 
  ON unified_orders FOR SELECT 
  USING (vendor_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Customers can view own orders" 
  ON unified_orders FOR SELECT 
  USING (customer_phone = COALESCE(
    (current_setting('request.jwt.claims', true)::json ->> 'phone'),
    (current_setting('request.jwt.claims', true)::json ->> 'sub')
  ));

-- Create RLS policies for conversations
CREATE POLICY IF NOT EXISTS "Admin can manage all conversations" 
  ON conversations FOR ALL 
  USING (is_admin()) 
  WITH CHECK (is_admin());

CREATE POLICY IF NOT EXISTS "Users can view own conversations" 
  ON conversations FOR SELECT 
  USING (contact_phone = COALESCE(
    (current_setting('request.jwt.claims', true)::json ->> 'phone'),
    (current_setting('request.jwt.claims', true)::json ->> 'sub')
  ) OR contact_id = COALESCE(
    (current_setting('request.jwt.claims', true)::json ->> 'phone'),
    (current_setting('request.jwt.claims', true)::json ->> 'sub')
  ));

CREATE POLICY IF NOT EXISTS "System can manage conversations" 
  ON conversations FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Create RLS policies for messages
CREATE POLICY IF NOT EXISTS "Admin can manage all messages" 
  ON messages FOR ALL 
  USING (is_admin()) 
  WITH CHECK (is_admin());

CREATE POLICY IF NOT EXISTS "Users can view messages in own conversations" 
  ON messages FOR SELECT 
  USING (conversation_id IN (
    SELECT id FROM conversations 
    WHERE contact_phone = COALESCE(
      (current_setting('request.jwt.claims', true)::json ->> 'phone'),
      (current_setting('request.jwt.claims', true)::json ->> 'sub')
    ) OR contact_id = COALESCE(
      (current_setting('request.jwt.claims', true)::json ->> 'phone'),
      (current_setting('request.jwt.claims', true)::json ->> 'sub')
    )
  ));

CREATE POLICY IF NOT EXISTS "System can manage messages" 
  ON messages FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER IF NOT EXISTS update_unified_listings_updated_at 
  BEFORE UPDATE ON unified_listings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_unified_orders_updated_at 
  BEFORE UPDATE ON unified_orders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_conversations_updated_at 
  BEFORE UPDATE ON conversations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_messages_updated_at 
  BEFORE UPDATE ON messages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create functions for spatial queries
CREATE OR REPLACE FUNCTION find_nearby_listings(
  lat double precision,
  lng double precision,
  radius_km double precision DEFAULT 10.0
)
RETURNS TABLE (
  id uuid,
  title text,
  listing_type listing_type_enum,
  price numeric,
  distance_km double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ul.id,
    ul.title,
    ul.listing_type,
    ul.price,
    ST_Distance(ul.location_gps, ST_Point(lng, lat)::geography) / 1000 as distance_km
  FROM unified_listings ul
  WHERE ul.status = 'active'
    AND ul.location_gps IS NOT NULL
    AND ST_DWithin(ul.location_gps, ST_Point(lng, lat)::geography, radius_km * 1000)
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on tables
COMMENT ON TABLE unified_listings IS 'Consolidated table for all listing types: products, produce, properties, vehicles, hardware';
COMMENT ON TABLE unified_orders IS 'Consolidated table for all order types with domain-specific metadata';
COMMENT ON TABLE conversations IS 'Normalized conversation threading across all channels';
COMMENT ON TABLE messages IS 'Unified message store for all conversation channels';

-- Grant permissions
GRANT SELECT ON unified_listings TO authenticated;
GRANT SELECT ON unified_orders TO authenticated;
GRANT SELECT ON conversations TO authenticated;
GRANT SELECT ON messages TO authenticated;