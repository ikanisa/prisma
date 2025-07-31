-- Create conversation_state table for tracking user journey stages
CREATE TABLE IF NOT EXISTS conversation_state (
  user_id         text PRIMARY KEY,
  stage           text DEFAULT 'new',          -- new, payments, mobility, ordering, listings, support, etc.
  last_domain     text,
  last_template   text,
  last_user_msg_at timestamptz,
  updated_at      timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE conversation_state ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage own conversation state" 
ON conversation_state 
FOR ALL 
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- Allow system access
CREATE POLICY "System can manage conversation state" 
ON conversation_state 
FOR ALL 
USING (true)
WITH CHECK (true);