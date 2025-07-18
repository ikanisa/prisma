-- WhatsApp Integration Database Schema Completion
-- Missing tables for full WhatsApp integration

-- 1. Message logs table (unified across platforms)
CREATE TABLE IF NOT EXISTS public.message_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('whatsapp', 'telegram', 'web')),
  sender_id TEXT NOT NULL,
  contact_name TEXT,
  message_content TEXT NOT NULL,
  message_id TEXT UNIQUE,
  timestamp TIMESTAMPTZ NOT NULL,
  processed BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Conversations table (proper conversation management)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'telegram', 'web')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  message_count INTEGER DEFAULT 0,
  model_used TEXT,
  conversation_duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Contacts table (contact/user management)
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT,
  contact_type TEXT DEFAULT 'prospect' CHECK (contact_type IN ('prospect', 'customer', 'lead', 'vendor', 'driver')),
  first_contact_date TIMESTAMPTZ DEFAULT NOW(),
  last_interaction TIMESTAMPTZ,
  total_conversations INTEGER DEFAULT 0,
  preferred_channel TEXT DEFAULT 'whatsapp',
  location TEXT,
  conversion_status TEXT DEFAULT 'prospect' CHECK (conversion_status IN ('prospect', 'lead', 'customer', 'churned')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_message_logs_sender ON public.message_logs(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_timestamp ON public.message_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_message_logs_platform ON public.message_logs(platform);
CREATE INDEX IF NOT EXISTS idx_conversations_contact ON public.conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON public.contacts(contact_type);

-- Enable RLS
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin access and system operations
CREATE POLICY "Admin read message_logs" ON public.message_logs FOR SELECT USING (is_admin());
CREATE POLICY "System manage message_logs" ON public.message_logs FOR ALL WITH CHECK (true);

CREATE POLICY "Admin read conversations" ON public.conversations FOR SELECT USING (is_admin());
CREATE POLICY "System manage conversations" ON public.conversations FOR ALL WITH CHECK (true);

CREATE POLICY "Admin read contacts" ON public.contacts FOR SELECT USING (is_admin());
CREATE POLICY "System manage contacts" ON public.contacts FOR ALL WITH CHECK (true);

-- Trigger for updating conversation message count
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations 
  SET message_count = message_count + 1,
      ended_at = CASE WHEN NEW.sender = 'agent' THEN NOW() ELSE ended_at END
  WHERE contact_id = NEW.phone_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_count
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_message_count();

-- Trigger for updating contact last interaction
CREATE OR REPLACE FUNCTION update_contact_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.contacts (phone_number, name, last_interaction, total_conversations)
  VALUES (NEW.sender_id, NEW.contact_name, NOW(), 1)
  ON CONFLICT (phone_number) 
  DO UPDATE SET 
    last_interaction = NOW(),
    total_conversations = contacts.total_conversations + 1,
    name = COALESCE(contacts.name, NEW.contact_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contact_interaction
  AFTER INSERT ON public.message_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_last_interaction();