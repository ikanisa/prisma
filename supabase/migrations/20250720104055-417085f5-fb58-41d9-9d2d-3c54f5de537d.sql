-- STEP 5: WhatsApp Integration Enhancement - Database Schema (Fixed)
-- Add new tables for enhanced WhatsApp message tracking and template management

-- WhatsApp delivery metrics for tracking message performance
CREATE TABLE IF NOT EXISTS public.whatsapp_delivery_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  template_name TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'template', 'interactive')),
  delivery_time_ms INTEGER,
  delivered BOOLEAN NOT NULL DEFAULT false,
  error_details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation flows for tracking user journey stages
CREATE TABLE IF NOT EXISTS public.conversation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  flow_name TEXT NOT NULL,
  current_step TEXT NOT NULL,
  flow_data JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'error'))
);

-- Enhanced conversation tracking
CREATE TABLE IF NOT EXISTS public.conversation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  session_id UUID DEFAULT gen_random_uuid(),
  first_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  total_messages INTEGER DEFAULT 0,
  agent_messages INTEGER DEFAULT 0,
  user_messages INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  satisfaction_rating INTEGER,
  flow_completed BOOLEAN DEFAULT false,
  conversion_event TEXT,
  session_duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_delivery_metrics_phone ON public.whatsapp_delivery_metrics(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_delivery_metrics_template ON public.whatsapp_delivery_metrics(template_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_delivery_metrics_created ON public.whatsapp_delivery_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_flows_phone ON public.conversation_flows(phone_number);
CREATE INDEX IF NOT EXISTS idx_conversation_flows_status ON public.conversation_flows(status);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_phone ON public.conversation_analytics(phone_number);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_session ON public.conversation_analytics(session_id);

-- RLS Policies for new tables only
ALTER TABLE public.whatsapp_delivery_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_analytics ENABLE ROW LEVEL SECURITY;

-- System access for metrics and analytics
CREATE POLICY "Admin can view delivery metrics" 
ON public.whatsapp_delivery_metrics FOR SELECT 
USING (is_admin());

CREATE POLICY "System can manage delivery metrics" 
ON public.whatsapp_delivery_metrics FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Admin can view conversation flows" 
ON public.conversation_flows FOR SELECT 
USING (is_admin());

CREATE POLICY "System can manage conversation flows" 
ON public.conversation_flows FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Admin can view conversation analytics" 
ON public.conversation_analytics FOR SELECT 
USING (is_admin());

CREATE POLICY "System can manage conversation analytics" 
ON public.conversation_analytics FOR ALL 
USING (true)
WITH CHECK (true);

-- Function to update conversation analytics
CREATE OR REPLACE FUNCTION update_conversation_analytics()
RETURNS TRIGGER AS $$
DECLARE
  phone_clean TEXT;
  analytics_record RECORD;
  response_time INTEGER;
  last_agent_msg TIMESTAMPTZ;
BEGIN
  phone_clean := NEW.phone_number;
  
  -- Get or create analytics record for today's session
  SELECT * INTO analytics_record 
  FROM conversation_analytics 
  WHERE phone_number = phone_clean 
  AND DATE(created_at) = DATE(NOW())
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF analytics_record IS NULL THEN
    -- Create new session
    INSERT INTO conversation_analytics (
      phone_number,
      first_message_at,
      last_message_at,
      total_messages,
      agent_messages,
      user_messages
    ) VALUES (
      phone_clean,
      NEW.created_at,
      NEW.created_at,
      1,
      CASE WHEN NEW.sender = 'agent' THEN 1 ELSE 0 END,
      CASE WHEN NEW.sender = 'user' THEN 1 ELSE 0 END
    );
  ELSE
    -- Update existing session
    UPDATE conversation_analytics 
    SET 
      last_message_at = NEW.created_at,
      total_messages = total_messages + 1,
      agent_messages = agent_messages + CASE WHEN NEW.sender = 'agent' THEN 1 ELSE 0 END,
      user_messages = user_messages + CASE WHEN NEW.sender = 'user' THEN 1 ELSE 0 END,
      session_duration_minutes = EXTRACT(EPOCH FROM (NEW.created_at - first_message_at)) / 60,
      updated_at = NOW()
    WHERE id = analytics_record.id;
    
    -- Calculate average response time for user messages
    IF NEW.sender = 'user' THEN
      SELECT created_at INTO last_agent_msg
      FROM conversation_messages
      WHERE phone_number = phone_clean 
      AND sender = 'agent'
      AND created_at < NEW.created_at
      ORDER BY created_at DESC
      LIMIT 1;
      
      IF last_agent_msg IS NOT NULL THEN
        response_time := EXTRACT(EPOCH FROM (NEW.created_at - last_agent_msg)) * 1000;
        
        UPDATE conversation_analytics 
        SET avg_response_time_ms = (
          COALESCE(avg_response_time_ms * (user_messages - 1), 0) + response_time
        ) / user_messages
        WHERE id = analytics_record.id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for conversation analytics
DROP TRIGGER IF EXISTS trigger_update_conversation_analytics ON conversation_messages;
CREATE TRIGGER trigger_update_conversation_analytics
  AFTER INSERT ON conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_analytics();