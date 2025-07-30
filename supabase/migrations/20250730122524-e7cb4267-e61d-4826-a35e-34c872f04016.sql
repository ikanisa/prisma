-- **FIX #1 & #5: DATABASE CONSTRAINTS** - Add unique constraint and proper indexes

-- Create unique constraint on processed_inbound to prevent duplicate message processing
ALTER TABLE processed_inbound 
ADD CONSTRAINT unique_message_id UNIQUE (msg_id);

-- Create index for faster duplicate checks
CREATE INDEX IF NOT EXISTS idx_processed_inbound_msg_id ON processed_inbound(msg_id);
CREATE INDEX IF NOT EXISTS idx_processed_inbound_wa_id ON processed_inbound(wa_id);
CREATE INDEX IF NOT EXISTS idx_processed_inbound_processed_at ON processed_inbound(processed_at);

-- Add timeout and retry columns to track processing issues
ALTER TABLE processed_inbound 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS processing_timeout BOOLEAN DEFAULT FALSE;

-- Create function to clean up old processed messages (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_processed_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM processed_inbound 
  WHERE processed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Create unique constraint on message_logs to prevent log duplicates
ALTER TABLE message_logs 
ADD CONSTRAINT unique_message_log UNIQUE (message_id, sender_id, platform);

-- Add circuit breaker table for tracking function failures
CREATE TABLE IF NOT EXISTS function_circuit_breaker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL UNIQUE,
  failure_count INTEGER DEFAULT 0,
  last_failure_at TIMESTAMP WITH TIME ZONE,
  circuit_open BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policy for circuit breaker
ALTER TABLE function_circuit_breaker ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System can manage circuit breaker" ON function_circuit_breaker
  FOR ALL USING (true) WITH CHECK (true);