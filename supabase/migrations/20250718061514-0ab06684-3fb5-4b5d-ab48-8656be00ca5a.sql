-- Create WhatsApp logs table
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  message_id      text PRIMARY KEY,
  phone_number    text,
  contact_name    text,
  message_type    text,
  message_content text,
  media_id        text,
  processed       boolean DEFAULT false,
  processed_at    timestamp,
  timestamp       timestamp,
  received_at     timestamp DEFAULT now()
);

-- Create conversation messages table
CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text,
  channel text,
  sender text, -- 'user' | 'agent'
  message_text text,
  model_used text,
  confidence_score numeric,
  created_at timestamp DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "admin_read_whatsapp_logs" ON public.whatsapp_logs 
  FOR SELECT USING (is_admin());

CREATE POLICY "system_manage_whatsapp_logs" ON public.whatsapp_logs 
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "admin_all_conversation_messages" ON public.conversation_messages 
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "system_manage_conversation_messages" ON public.conversation_messages 
  FOR ALL USING (true) WITH CHECK (true);