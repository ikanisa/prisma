-- Create idempotency tables to prevent duplicate messages
CREATE TABLE IF NOT EXISTS processed_inbound (
  msg_id TEXT PRIMARY KEY,
  wa_id TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS outgoing_log (
  tx_hash TEXT PRIMARY KEY,
  wa_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivery_status TEXT DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add banner throttle column to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_banner_ts TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_processed_inbound_wa_id ON processed_inbound(wa_id);
CREATE INDEX IF NOT EXISTS idx_processed_inbound_processed_at ON processed_inbound(processed_at);
CREATE INDEX IF NOT EXISTS idx_outgoing_log_wa_id ON outgoing_log(wa_id);
CREATE INDEX IF NOT EXISTS idx_outgoing_log_sent_at ON outgoing_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_contacts_last_banner_ts ON contacts(last_banner_ts);

-- Enable RLS
ALTER TABLE processed_inbound ENABLE ROW LEVEL SECURITY;
ALTER TABLE outgoing_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for system access
CREATE POLICY "System can manage processed_inbound" ON processed_inbound
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System can manage outgoing_log" ON outgoing_log
  FOR ALL USING (true) WITH CHECK (true);