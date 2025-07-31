
-- Create conversation bridges table for direct seller-buyer communication
CREATE TABLE IF NOT EXISTS conversation_bridges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_phone text NOT NULL,
  seller_phone text NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('vehicle', 'property', 'product', 'service')),
  item_id uuid NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  initial_message text,
  message_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  completion_reason text
);

-- Create bridge conversations table for logging all messages
CREATE TABLE IF NOT EXISTS bridge_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bridge_id uuid REFERENCES conversation_bridges(id) ON DELETE CASCADE,
  sender_phone text NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('buyer', 'seller')),
  message text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'voice')),
  created_at timestamptz DEFAULT now()
);

-- Add RLS policies
ALTER TABLE conversation_bridges ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_bridges
CREATE POLICY "Admin can manage conversation bridges"
ON conversation_bridges FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users can view their bridge conversations"
ON conversation_bridges FOR SELECT
USING (buyer_phone = current_setting('app.current_user_phone', true) OR 
       seller_phone = current_setting('app.current_user_phone', true));

CREATE POLICY "System can manage conversation bridges"
ON conversation_bridges FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for bridge_conversations
CREATE POLICY "Admin can manage bridge conversations"
ON bridge_conversations FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users can view their bridge messages"
ON bridge_conversations FOR SELECT
USING (bridge_id IN (
  SELECT id FROM conversation_bridges 
  WHERE buyer_phone = current_setting('app.current_user_phone', true) OR 
        seller_phone = current_setting('app.current_user_phone', true)
));

CREATE POLICY "System can manage bridge conversations"
ON bridge_conversations FOR ALL
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_bridges_buyer ON conversation_bridges(buyer_phone);
CREATE INDEX IF NOT EXISTS idx_conversation_bridges_seller ON conversation_bridges(seller_phone);
CREATE INDEX IF NOT EXISTS idx_conversation_bridges_item ON conversation_bridges(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_conversation_bridges_status ON conversation_bridges(status);
CREATE INDEX IF NOT EXISTS idx_bridge_conversations_bridge_id ON bridge_conversations(bridge_id);
CREATE INDEX IF NOT EXISTS idx_bridge_conversations_sender ON bridge_conversations(sender_phone);
CREATE INDEX IF NOT EXISTS idx_bridge_conversations_created_at ON bridge_conversations(created_at DESC);

-- Add comments
COMMENT ON TABLE conversation_bridges IS 'Direct communication bridges between buyers and sellers';
COMMENT ON TABLE bridge_conversations IS 'All messages exchanged through conversation bridges';
