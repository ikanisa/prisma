-- Phase 1: Database Schema Consolidation and RLS Enhancement
-- Create consolidated tables structure following the refactor requirements

-- 1. Enhanced system metrics with better structure
CREATE TABLE IF NOT EXISTS system_metrics_enhanced (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('performance', 'business', 'technical', 'security')),
  measurement_unit TEXT,
  tags JSONB DEFAULT '{}',
  dimensions JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  source TEXT NOT NULL,
  environment TEXT DEFAULT 'production',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_metrics_enhanced ENABLE ROW LEVEL SECURITY;

-- Create admin-only access policy
CREATE POLICY "Admin can manage system metrics"
ON system_metrics_enhanced
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- 2. Consolidated messaging table (merge conversations, messages, etc.)
CREATE TABLE IF NOT EXISTS unified_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  session_id UUID DEFAULT gen_random_uuid(),
  conversation_type TEXT DEFAULT 'support' CHECK (conversation_type IN ('support', 'sales', 'service', 'bridge')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_agent TEXT,
  metadata JSONB DEFAULT '{}',
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  total_messages INTEGER DEFAULT 0,
  satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 5),
  resolution_time_minutes INTEGER
);

ALTER TABLE unified_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage conversations"
ON unified_conversations
FOR ALL
USING (true)
WITH CHECK (true);

-- 3. Consolidated messages table
CREATE TABLE IF NOT EXISTS unified_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES unified_conversations(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'agent', 'system', 'bot')),
  message_text TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'location', 'contact')),
  message_status TEXT DEFAULT 'sent' CHECK (message_status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  agent_id TEXT,
  model_used TEXT,
  confidence_score NUMERIC CHECK (confidence_score BETWEEN 0 AND 1),
  processing_time_ms INTEGER,
  media_url TEXT,
  media_type TEXT,
  media_size INTEGER,
  reply_to_message_id UUID REFERENCES unified_messages(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE unified_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage messages"
ON unified_messages
FOR ALL
USING (true)
WITH CHECK (true);

-- 4. Enhanced contacts table with better segmentation
CREATE TABLE IF NOT EXISTS unified_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  preferred_language TEXT DEFAULT 'en',
  contact_source TEXT DEFAULT 'whatsapp' CHECK (contact_source IN ('whatsapp', 'import', 'referral', 'organic')),
  contact_type TEXT DEFAULT 'prospect' CHECK (contact_type IN ('prospect', 'customer', 'vendor', 'partner', 'support')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'opted_out', 'inactive')),
  lifecycle_stage TEXT DEFAULT 'lead' CHECK (lifecycle_stage IN ('lead', 'qualified', 'opportunity', 'customer', 'advocate')),
  location_data JSONB,
  preferences JSONB DEFAULT '{}',
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  first_contact_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_interaction_date TIMESTAMP WITH TIME ZONE,
  total_conversations INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  avg_response_time_minutes INTEGER,
  satisfaction_rating NUMERIC CHECK (satisfaction_rating BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE unified_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage contacts"
ON unified_contacts
FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Enhanced edge function execution logs
CREATE TABLE IF NOT EXISTS edge_function_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  execution_id UUID DEFAULT gen_random_uuid(),
  user_id TEXT,
  phone_number TEXT,
  request_method TEXT,
  request_path TEXT,
  request_headers JSONB,
  request_body JSONB,
  response_status INTEGER,
  response_body JSONB,
  error_message TEXT,
  error_stack TEXT,
  execution_time_ms INTEGER,
  memory_used_mb NUMERIC,
  cold_start BOOLEAN DEFAULT false,
  environment TEXT DEFAULT 'production',
  version TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE edge_function_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view function logs"
ON edge_function_logs
FOR SELECT
USING (is_admin());

CREATE POLICY "System can insert function logs"
ON edge_function_logs
FOR INSERT
WITH CHECK (true);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics_enhanced(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_type ON system_metrics_enhanced(metric_name, metric_type);

CREATE INDEX IF NOT EXISTS idx_conversations_phone ON unified_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON unified_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_type_status ON unified_conversations(conversation_type, status);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON unified_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_phone ON unified_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_messages_created ON unified_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contacts_phone ON unified_contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_type_stage ON unified_contacts(contact_type, lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_contacts_updated ON unified_contacts(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_function_logs_function_time ON edge_function_logs(function_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_function_logs_user ON edge_function_logs(user_id, created_at DESC);

-- 7. Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON unified_conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at 
    BEFORE UPDATE ON unified_contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();