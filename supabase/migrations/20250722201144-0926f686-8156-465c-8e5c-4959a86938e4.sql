-- Add missing columns to conversation_messages table
ALTER TABLE conversation_messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent',
ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES conversation_messages(id),
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add missing columns to contacts table  
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_typing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Create conversations summary view for chat list
CREATE OR REPLACE VIEW conversation_summary AS
SELECT 
  c.phone_number,
  c.name as contact_name,
  c.avatar_url as contact_avatar,
  'whatsapp' as channel,
  'active' as status,
  COUNT(cm.id) as message_count,
  MAX(cm.message_text) as last_message,
  MAX(cm.created_at) as last_message_time,
  MAX(cm.sender) as last_message_sender,
  0 as unread_count,
  false as is_pinned,
  false as is_muted,
  false as is_archived,
  EXTRACT(EPOCH FROM (MAX(cm.created_at) - MIN(cm.created_at)))/60 as conversation_duration_minutes
FROM contacts c
LEFT JOIN conversation_messages cm ON c.phone_number = cm.phone_number
GROUP BY c.phone_number, c.name, c.avatar_url;

-- Create file uploads table for file management
CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  upload_status TEXT DEFAULT 'uploading',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on file_uploads
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for file_uploads
CREATE POLICY "Admin can manage file uploads" ON file_uploads
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "System can manage file uploads" ON file_uploads
  FOR ALL USING (true)
  WITH CHECK (true);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  phone_number TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  status TEXT DEFAULT 'unread',
  priority TEXT DEFAULT 'normal',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their notifications" ON notifications
  FOR SELECT USING (
    user_id = auth.uid() OR 
    phone_number = current_setting('app.current_user_phone', true)
  );

CREATE POLICY "System can manage notifications" ON notifications
  FOR ALL USING (true)
  WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_messages_phone_created 
  ON conversation_messages(phone_number, created_at);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_reply_to 
  ON conversation_messages(reply_to) WHERE reply_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_file_uploads_phone 
  ON file_uploads(phone_number);

CREATE INDEX IF NOT EXISTS idx_notifications_user_status 
  ON notifications(user_id, status) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_phone_status 
  ON notifications(phone_number, status) WHERE phone_number IS NOT NULL;