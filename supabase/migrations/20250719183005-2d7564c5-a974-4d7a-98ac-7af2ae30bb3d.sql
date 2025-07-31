-- Production Readiness Schema: Contact Limits, Outbound Queue, Quality Loop, Human Handoff

-- 1. Contact limits for compliance
CREATE TABLE contact_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  daily_count INTEGER DEFAULT 0,
  weekly_count INTEGER DEFAULT 0,
  monthly_count INTEGER DEFAULT 0,
  last_reset_daily DATE DEFAULT CURRENT_DATE,
  last_reset_weekly DATE DEFAULT CURRENT_DATE,
  last_reset_monthly DATE DEFAULT CURRENT_DATE,
  is_opted_out BOOLEAN DEFAULT false,
  opt_out_reason TEXT,
  opt_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Outbound message queue for reliability
CREATE TABLE outbound_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  message_text TEXT NOT NULL,
  template_id TEXT,
  channel TEXT DEFAULT 'whatsapp',
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'failed', 'cancelled')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_attempt_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  failed_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Conversation quality evaluations
CREATE TABLE conversation_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  message_id UUID,
  phone_number TEXT,
  style_score NUMERIC(3,2) CHECK (style_score >= 0 AND style_score <= 1),
  clarity_score NUMERIC(3,2) CHECK (clarity_score >= 0 AND clarity_score <= 1),
  helpfulness_score NUMERIC(3,2) CHECK (helpfulness_score >= 0 AND helpfulness_score <= 1),
  overall_score NUMERIC(3,2) CHECK (overall_score >= 0 AND overall_score <= 1),
  evaluation_notes TEXT,
  model_used TEXT,
  evaluated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Human handoff system
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS handoff_requested BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS handoff_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS handoff_reason TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_agent_id UUID;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- 5. Internationalization messages
CREATE TABLE i18n_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_key TEXT NOT NULL,
  language_code TEXT NOT NULL DEFAULT 'en',
  message_text TEXT NOT NULL,
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_key, language_code)
);

-- 6. Experiments framework
CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  traffic_split NUMERIC(3,2) DEFAULT 0.5 CHECK (traffic_split >= 0 AND traffic_split <= 1),
  control_variant JSONB DEFAULT '{}',
  test_variant JSONB DEFAULT '{}',
  success_metric TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES experiments(id),
  phone_number TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('control', 'test')),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(experiment_id, phone_number)
);

-- 7. System metrics for observability
CREATE TABLE system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  metric_type TEXT DEFAULT 'counter' CHECK (metric_type IN ('counter', 'gauge', 'histogram')),
  tags JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_contact_limits_phone ON contact_limits(phone_number);
CREATE INDEX idx_outbound_queue_status ON outbound_queue(status);
CREATE INDEX idx_outbound_queue_next_attempt ON outbound_queue(next_attempt_at) WHERE status = 'queued';
CREATE INDEX idx_conversation_evaluations_conversation ON conversation_evaluations(conversation_id);
CREATE INDEX idx_conversations_handoff ON conversations(handoff_requested) WHERE handoff_requested = true;
CREATE INDEX idx_i18n_lookup ON i18n_messages(message_key, language_code);
CREATE INDEX idx_experiment_assignments_lookup ON experiment_assignments(experiment_id, phone_number);
CREATE INDEX idx_system_metrics_name_time ON system_metrics(metric_name, recorded_at);

-- Enable RLS on new tables
ALTER TABLE contact_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE i18n_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "System can manage contact limits" ON contact_limits FOR ALL USING (true);
CREATE POLICY "System can manage outbound queue" ON outbound_queue FOR ALL USING (true);
CREATE POLICY "Admin can view evaluations" ON conversation_evaluations FOR SELECT USING (is_admin());
CREATE POLICY "System can manage evaluations" ON conversation_evaluations FOR ALL USING (true);
CREATE POLICY "System can read i18n messages" ON i18n_messages FOR SELECT USING (true);
CREATE POLICY "Admin can manage i18n messages" ON i18n_messages FOR ALL USING (is_admin());
CREATE POLICY "Admin can manage experiments" ON experiments FOR ALL USING (is_admin());
CREATE POLICY "System can manage experiment assignments" ON experiment_assignments FOR ALL USING (true);
CREATE POLICY "Admin can view metrics" ON system_metrics FOR SELECT USING (is_admin());
CREATE POLICY "System can manage metrics" ON system_metrics FOR ALL USING (true);

-- Insert default i18n messages
INSERT INTO i18n_messages (message_key, language_code, message_text) VALUES
('greeting', 'en', 'Hello! Welcome to easyMO. How can I help you today?'),
('greeting', 'rw', 'Muraho! Murakaza neza kuri easyMO. Nabasha kugufasha nte?'),
('greeting', 'fr', 'Bonjour! Bienvenue chez easyMO. Comment puis-je vous aider aujourd''hui?'),
('error_network', 'en', 'Sorry, I''m having a network issue. Please try again in a moment.'),
('error_network', 'rw', 'Mbabarira, mfite ikibazo cya network. Nyabuna ugerageze nyuma y''akanya.'),
('error_network', 'fr', 'Désolé, j''ai un problème de réseau. Veuillez réessayer dans un moment.'),
('handoff_requested', 'en', '👋 A human agent will help you shortly. Please wait.'),
('handoff_requested', 'rw', '👋 Umuntu azagufasha vuba. Nyabuna utegereze.'),
('handoff_requested', 'fr', '👋 Un agent humain vous aidera sous peu. Veuillez patienter.'),
('opt_out_confirmation', 'en', 'You have been unsubscribed. Reply START to resubscribe.'),
('opt_out_confirmation', 'rw', 'Wavanye kuri service. Andika START kugira ubongere kwiyandikisha.'),
('opt_out_confirmation', 'fr', 'Vous avez été désabonné. Répondez START pour vous réabonner.');

-- Function to update contact limits
CREATE OR REPLACE FUNCTION update_contact_limits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO contact_limits (phone_number, daily_count, weekly_count, monthly_count)
  VALUES (NEW.phone_number, 1, 1, 1)
  ON CONFLICT (phone_number) DO UPDATE SET
    daily_count = CASE 
      WHEN contact_limits.last_reset_daily < CURRENT_DATE THEN 1
      ELSE contact_limits.daily_count + 1
    END,
    weekly_count = CASE
      WHEN contact_limits.last_reset_weekly < CURRENT_DATE - INTERVAL '7 days' THEN 1
      ELSE contact_limits.weekly_count + 1
    END,
    monthly_count = CASE
      WHEN contact_limits.last_reset_monthly < CURRENT_DATE - INTERVAL '30 days' THEN 1
      ELSE contact_limits.monthly_count + 1
    END,
    last_reset_daily = CASE
      WHEN contact_limits.last_reset_daily < CURRENT_DATE THEN CURRENT_DATE
      ELSE contact_limits.last_reset_daily
    END,
    last_reset_weekly = CASE
      WHEN contact_limits.last_reset_weekly < CURRENT_DATE - INTERVAL '7 days' THEN CURRENT_DATE
      ELSE contact_limits.last_reset_weekly
    END,
    last_reset_monthly = CASE
      WHEN contact_limits.last_reset_monthly < CURRENT_DATE - INTERVAL '30 days' THEN CURRENT_DATE
      ELSE contact_limits.last_reset_monthly
    END,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update contact limits on new messages
CREATE TRIGGER update_contact_limits_trigger
  AFTER INSERT ON conversation_messages
  FOR EACH ROW
  WHEN (NEW.sender = 'agent')
  EXECUTE FUNCTION update_contact_limits();