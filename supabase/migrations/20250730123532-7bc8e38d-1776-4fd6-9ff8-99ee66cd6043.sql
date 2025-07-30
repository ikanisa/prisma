-- Create processed_inbound table if it doesn't exist
CREATE TABLE IF NOT EXISTS processed_inbound (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  msg_id TEXT NOT NULL,
  wa_id TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  processing_timeout BOOLEAN DEFAULT FALSE
);

-- Add unique constraint to prevent duplicate message processing
ALTER TABLE processed_inbound 
ADD CONSTRAINT IF NOT EXISTS unique_message_id UNIQUE (msg_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_processed_inbound_msg_id ON processed_inbound(msg_id);
CREATE INDEX IF NOT EXISTS idx_processed_inbound_wa_id ON processed_inbound(wa_id);
CREATE INDEX IF NOT EXISTS idx_processed_inbound_processed_at ON processed_inbound(processed_at);

-- Add unique constraint on message_logs to prevent log duplicates
ALTER TABLE message_logs 
ADD CONSTRAINT IF NOT EXISTS unique_message_log UNIQUE (message_id, sender_id, platform);

-- Enable RLS on processed_inbound
ALTER TABLE processed_inbound ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for system access
CREATE POLICY IF NOT EXISTS "System can manage processed_inbound" ON processed_inbound
  FOR ALL USING (true) WITH CHECK (true);

-- Create function to clean up old processed messages (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_processed_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM processed_inbound 
  WHERE processed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;