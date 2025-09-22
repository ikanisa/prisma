-- ===============================================
-- easyMO Unified Ordering System - Part 2d: Conversation Tables & RLS
-- ===============================================

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

-- Create remaining indexes
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

-- RLS Policies for carts (admin and system access)
CREATE POLICY "Admin can manage all carts" ON carts
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "System can manage carts" ON carts
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for cart_items
CREATE POLICY "Admin can manage cart items" ON cart_items
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "System can manage cart items" ON cart_items
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for deliveries
CREATE POLICY "Admin can manage deliveries" ON deliveries
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "System can manage deliveries" ON deliveries
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for contacts
CREATE POLICY "Admin can manage contacts" ON contacts
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "System can manage contacts" ON contacts
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for conversations
CREATE POLICY "Admin can manage conversations" ON conversations
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "System can manage conversations" ON conversations
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for conversation_messages
CREATE POLICY "Admin can manage conversation messages" ON conversation_messages
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "System can manage conversation messages" ON conversation_messages
  FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_carts_updated_at ON carts;
CREATE TRIGGER update_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deliveries_updated_at ON deliveries;
CREATE TRIGGER update_deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();