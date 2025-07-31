-- Create users table with the specified structure
CREATE TABLE IF NOT EXISTS users_new (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id         text UNIQUE,           -- WhatsApp phone number incl. country code
  display_name  text,
  momo_number   text,
  language      text DEFAULT 'en',
  source        text DEFAULT 'whatsapp',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_new_wa_id ON users_new(wa_id);

-- Enable RLS
ALTER TABLE users_new ENABLE ROW LEVEL SECURITY;

-- Create policies for system access
CREATE POLICY "System can manage users_new" ON users_new
  FOR ALL USING (true) WITH CHECK (true);

-- Drop the old empty users table and rename the new one
DROP TABLE IF EXISTS users CASCADE;
ALTER TABLE users_new RENAME TO users;