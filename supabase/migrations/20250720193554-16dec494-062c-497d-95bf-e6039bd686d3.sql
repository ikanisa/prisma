-- ============================================================================
-- Phase 1: Database Schema Consolidation
-- Migration: Consolidate Products, Orders, and Conversations 
-- ============================================================================

-- 1. Create unified_listings table (consolidates products, produce, properties, vehicles)
CREATE TYPE listing_type_enum AS ENUM ('product', 'produce', 'property', 'vehicle', 'hardware');

CREATE TABLE IF NOT EXISTS unified_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_type listing_type_enum NOT NULL,
  title text NOT NULL,
  description text,
  price numeric(10,2),
  vendor_id uuid, -- Can reference businesses, farmers, or users
  metadata jsonb DEFAULT '{}', -- type-specific fields (specs, location details, etc)
  location_gps point,
  images text[], -- array of image URLs
  tags text[],
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold', 'archived')),
  visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'draft')),
  featured boolean DEFAULT false,
  stock_quantity integer DEFAULT 0,
  unit_of_measure text,
  category text,
  subcategory text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Add RLS
ALTER TABLE unified_listings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for unified_listings
CREATE POLICY "Admin can manage all listings" 
ON unified_listings FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "Vendors can manage own listings" 
ON unified_listings FOR ALL 
USING (vendor_id = auth.uid()) 
WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "Public can view active listings" 
ON unified_listings FOR SELECT 
USING (status = 'active' AND visibility = 'public');

-- Add indexes for performance
CREATE INDEX idx_unified_listings_type ON unified_listings(listing_type);
CREATE INDEX idx_unified_listings_vendor ON unified_listings(vendor_id);
CREATE INDEX idx_unified_listings_status ON unified_listings(status);
CREATE INDEX idx_unified_listings_location ON unified_listings USING GIST(location_gps);
CREATE INDEX idx_unified_listings_tags ON unified_listings USING GIN(tags);

-- Add comments
COMMENT ON TABLE unified_listings IS 'Consolidated table for all marketplace listings (products, produce, properties, vehicles)';
COMMENT ON COLUMN unified_listings.listing_type IS 'Type of listing - determines metadata schema';
COMMENT ON COLUMN unified_listings.metadata IS 'Type-specific data: product specs, property details, vehicle info, etc';

-- 2. Enhance unified_orders table 
ALTER TABLE unified_orders ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'marketplace';
ALTER TABLE unified_orders ADD COLUMN IF NOT EXISTS domain_metadata jsonb DEFAULT '{}';
ALTER TABLE unified_orders ADD COLUMN IF NOT EXISTS listing_ids uuid[];
ALTER TABLE unified_orders ADD COLUMN IF NOT EXISTS delivery_method text;
ALTER TABLE unified_orders ADD COLUMN IF NOT EXISTS delivery_address jsonb;

-- Add check constraint for order_type
ALTER TABLE unified_orders ADD CONSTRAINT check_order_type 
  CHECK (order_type IN ('marketplace', 'produce', 'pharmacy', 'hardware', 'services'));

-- Update comments
COMMENT ON TABLE unified_orders IS 'Consolidated orders table for all business domains';
COMMENT ON COLUMN unified_orders.order_type IS 'Business domain: marketplace, produce, pharmacy, etc';
COMMENT ON COLUMN unified_orders.domain_metadata IS 'Domain-specific order data';
COMMENT ON COLUMN unified_orders.listing_ids IS 'Array of listing IDs for this order';

-- 3. Normalize conversations and messages
-- Update conversations table structure
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS thread_id text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel text DEFAULT 'whatsapp';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS agent_id uuid;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Add constraint for channel
ALTER TABLE conversations ADD CONSTRAINT check_channel 
  CHECK (channel IN ('whatsapp', 'telegram', 'web', 'phone', 'email'));

-- Create consolidated messages table (if not exists)
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('user', 'agent', 'system', 'bot')),
  sender_id text, -- phone number, user_id, or agent_id
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'location', 'interactive')),
  metadata jsonb DEFAULT '{}', -- message-specific data (media URLs, coordinates, etc)
  thread_id text, -- for message threading
  reply_to_id uuid REFERENCES messages(id), -- for replies
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all messages" 
ON messages FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "System can manage messages" 
ON messages FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add indexes for messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_thread ON messages(thread_id);

-- Add comments  
COMMENT ON TABLE messages IS 'Unified messages table for all conversation channels';
COMMENT ON COLUMN messages.sender_type IS 'Type of message sender';
COMMENT ON COLUMN messages.metadata IS 'Channel-specific message data';

-- 4. Create view for backwards compatibility with existing code
CREATE OR REPLACE VIEW vw_products AS
SELECT 
  id,
  title as name,
  description,
  price,
  vendor_id as business_id,
  stock_quantity,
  unit_of_measure,
  category,
  status,
  created_at,
  updated_at
FROM unified_listings 
WHERE listing_type = 'product' AND deleted_at IS NULL;

CREATE OR REPLACE VIEW vw_produce_listings AS
SELECT 
  id,
  title as produce_name,
  description,
  price,
  vendor_id as farmer_id,
  stock_quantity as available_quantity,
  unit_of_measure,
  metadata->>'harvest_date' as harvest_date,
  metadata->>'organic' as is_organic,
  status,
  created_at,
  updated_at
FROM unified_listings 
WHERE listing_type = 'produce' AND deleted_at IS NULL;

-- 5. Create updated triggers for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to unified_listings
DROP TRIGGER IF EXISTS update_unified_listings_updated_at ON unified_listings;
CREATE TRIGGER update_unified_listings_updated_at
    BEFORE UPDATE ON unified_listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply to messages  
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Add soft delete function
CREATE OR REPLACE FUNCTION soft_delete_listing(listing_id uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE unified_listings 
  SET deleted_at = now(), status = 'archived' 
  WHERE id = listing_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;