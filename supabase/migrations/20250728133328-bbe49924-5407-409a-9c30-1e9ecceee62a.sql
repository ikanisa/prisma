-- Fix agent configuration and ensure proper agent orchestration
-- First, let's ensure we have proper OpenAI assistant configurations

-- Update the main agent config with proper OpenAI assistant
UPDATE agent_configs 
SET 
  assistant_id = 'asst_main_easymo_agent',
  system_prompt = 'You are easyMO, an AI assistant for a WhatsApp super-app in Rwanda and Malta. You help with payments (MoMo), marketplace (produce, vehicles, property), rides, and events. Always respond in a friendly, helpful manner. Keep responses under 160 characters when possible. Guide users to specific services using keywords like "ride", "payment", "buy", "sell".',
  temperature = 0.7,
  tools_json = '[
    {
      "type": "function",
      "function": {
        "name": "generate_momo_payment",
        "description": "Generate MoMo USSD payment code for Rwanda",
        "parameters": {
          "type": "object",
          "properties": {
            "amount": {"type": "number", "description": "Payment amount in RWF"},
            "recipient": {"type": "string", "description": "Recipient phone or code"},
            "purpose": {"type": "string", "description": "Payment description"}
          },
          "required": ["amount", "recipient"]
        }
      }
    },
    {
      "type": "function", 
      "function": {
        "name": "search_marketplace",
        "description": "Search products in marketplace",
        "parameters": {
          "type": "object",
          "properties": {
            "query": {"type": "string", "description": "Search term"},
            "category": {"type": "string", "description": "Product category"}
          },
          "required": ["query"]
        }
      }
    },
    {
      "type": "function",
      "function": {
        "name": "book_ride",
        "description": "Create ride booking request",
        "parameters": {
          "type": "object", 
          "properties": {
            "pickup": {"type": "string", "description": "Pickup location"},
            "destination": {"type": "string", "description": "Destination"},
            "passenger_phone": {"type": "string", "description": "Passenger phone"}
          },
          "required": ["pickup", "destination", "passenger_phone"]
        }
      }
    }
  ]'::jsonb,
  updated_at = now()
WHERE code = 'easymo_main';

-- Create agent memory table if it doesn't exist properly
CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  memory_type TEXT NOT NULL,
  memory_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, memory_type)
);

-- Enable RLS on agent_memory
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

-- Create policy for agent_memory
DROP POLICY IF EXISTS "Allow service role access to agent_memory" ON agent_memory;
CREATE POLICY "Allow service role access to agent_memory" ON agent_memory
  FOR ALL USING (true);

-- Ensure outbound_queue table exists for message sending
CREATE TABLE IF NOT EXISTS outbound_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on outbound_queue
ALTER TABLE outbound_queue ENABLE ROW LEVEL SECURITY;

-- Create policy for outbound_queue
DROP POLICY IF EXISTS "Allow service role access to outbound_queue" ON outbound_queue;
CREATE POLICY "Allow service role access to outbound_queue" ON outbound_queue
  FOR ALL USING (true);

-- Create index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_outbound_queue_status_priority 
  ON outbound_queue(status, priority DESC, next_attempt_at);

-- Update agent_conversations to ensure proper message flow
DROP TABLE IF EXISTS agent_conversations;
CREATE TABLE agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  message TEXT NOT NULL,
  ts TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on agent_conversations
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

-- Create policy for agent_conversations
DROP POLICY IF EXISTS "Allow service role access to agent_conversations" ON agent_conversations;
CREATE POLICY "Allow service role access to agent_conversations" ON agent_conversations
  FOR ALL USING (true);

-- Create index for conversation retrieval
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_ts 
  ON agent_conversations(user_id, ts DESC);