-- Create outgoing_messages table for storing AI responses
CREATE TABLE IF NOT EXISTS outgoing_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_number TEXT NOT NULL,
  message_text TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for outgoing_messages
ALTER TABLE outgoing_messages ENABLE ROW LEVEL SECURITY;

-- Allow system to manage outgoing messages
CREATE POLICY "System can manage outgoing messages" 
ON outgoing_messages 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Update incoming_messages status from 'new' to 'received' to match the processing logic
UPDATE incoming_messages SET status = 'received' WHERE status = 'new';

-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;