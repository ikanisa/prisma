-- Create base template_sends table first
CREATE TABLE IF NOT EXISTS template_sends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wa_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  event_type TEXT DEFAULT 'sent' CHECK (event_type IN ('sent', 'delivered', 'read', 'clicked', 'converted', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE template_sends ENABLE ROW LEVEL SECURITY;

-- Create policy for system access
CREATE POLICY "System can manage template sends" ON template_sends FOR ALL USING (true);

-- Create basic index
CREATE INDEX IF NOT EXISTS idx_template_sends_basic ON template_sends(template_name, sent_at, event_type);