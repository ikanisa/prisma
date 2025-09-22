-- ===============================================
-- easyMO Unified Ordering System - Part 2e: Conversation Tables (Safe)
-- ===============================================

-- 9. Create conversations table (without foreign key initially)
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id text,
  business_id uuid,
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

-- Add foreign key constraints after table creation
ALTER TABLE conversations 
ADD CONSTRAINT fk_conversations_contact_id 
FOREIGN KEY (contact_id) REFERENCES contacts(phone_number) ON DELETE CASCADE;

ALTER TABLE conversations 
ADD CONSTRAINT fk_conversations_business_id 
FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

-- Create remaining indexes
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_business_id ON conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at ON conversation_messages(created_at);