-- Create action_buttons table
CREATE TABLE IF NOT EXISTS action_buttons (
  id TEXT PRIMARY KEY,  -- PAY_QR, MAIN_MENU, etc.
  domain TEXT NOT NULL,
  label TEXT NOT NULL,  -- "Generate QR", "Main Menu", etc.
  payload TEXT NOT NULL, -- same as id for clarity
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient domain-based queries
CREATE INDEX IF NOT EXISTS idx_action_buttons_domain ON action_buttons(domain);

-- Enable RLS
ALTER TABLE action_buttons ENABLE ROW LEVEL SECURITY;

-- Admin can manage action buttons
CREATE POLICY "Admin can manage action buttons" ON action_buttons
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- System can read action buttons
CREATE POLICY "System can read action buttons" ON action_buttons
FOR SELECT USING (true);