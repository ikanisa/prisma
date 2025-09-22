-- ===== EASYMO PRODUCTION-GRADE FOUNDATION =====
-- Implementing comprehensive blueprint: compliance, quality, scalability, observability

-- 1. WhatsApp Compliance & Contact Management
CREATE TABLE IF NOT EXISTS public.contact_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  daily_count integer DEFAULT 0,
  weekly_count integer DEFAULT 0,
  monthly_count integer DEFAULT 0,
  last_reset_daily date DEFAULT CURRENT_DATE,
  last_reset_weekly date DEFAULT CURRENT_DATE,
  last_reset_monthly date DEFAULT CURRENT_DATE,
  is_opted_out boolean DEFAULT false,
  opt_out_at timestamptz,
  opt_out_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Enhanced Conversation System
CREATE TABLE IF NOT EXISTS public.conversation_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  thread_id text NOT NULL UNIQUE,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid,
  message_id uuid,
  phone_number text,
  overall_score numeric(3,2),
  helpfulness_score numeric(3,2),
  clarity_score numeric(3,2),
  style_score numeric(3,2),
  model_used text,
  evaluation_notes text,
  evaluated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 3. Human Handoff System  
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS handoff_requested boolean DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS handoff_at timestamptz;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS handoff_reason text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_agent_id uuid;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- 4. Outbound Message Queue
CREATE TABLE IF NOT EXISTS public.outbound_queue (
  id bigserial PRIMARY KEY,
  recipient text NOT NULL,
  channel text DEFAULT 'whatsapp',
  payload jsonb NOT NULL,
  template_id text,
  status text DEFAULT 'pending',
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  next_attempt_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbound_queue_status_next_attempt 
ON outbound_queue(status, next_attempt_at);

-- 5. A/B Testing & Experiments
CREATE TYPE experiment_status AS ENUM ('draft', 'active', 'paused', 'completed');

CREATE TABLE IF NOT EXISTS public.experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status experiment_status DEFAULT 'draft',
  traffic_split numeric(3,2) DEFAULT 0.5,
  control_variant jsonb DEFAULT '{}',
  test_variant jsonb DEFAULT '{}',
  success_metric text,
  start_date timestamptz,
  end_date timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.experiment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid REFERENCES experiments(id),
  phone_number text NOT NULL,
  variant text NOT NULL,
  assigned_at timestamptz DEFAULT now()
);

-- 6. Quality Gate & Fine-tuning
CREATE TABLE IF NOT EXISTS public.fine_tune_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text,
  training_file_id text,
  openai_job_id text,
  status text DEFAULT 'queued',
  fine_tuned_model text,
  error_message text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.evaluation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_name text NOT NULL,
  test_prompt text NOT NULL,
  expected_output text,
  actual_output text,
  score numeric(3,2),
  passed boolean,
  model_used text,
  execution_time_ms integer,
  created_at timestamptz DEFAULT now()
);

-- 7. Advanced Analytics & Metrics
CREATE TABLE IF NOT EXISTS public.contact_timing_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer, -- 0-6
  time_of_day integer, -- 0-23
  response_rate numeric(5,4),
  engagement_score numeric(5,4),
  success_rate numeric(5,4),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_learning_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  learning_summary text,
  confidence_level numeric(3,2),
  improvement_note text,
  timestamp timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fallback_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_model text,
  fallback_model text,
  task_type text,
  trigger_reason text,
  success boolean,
  created_at timestamptz DEFAULT now()
);

-- 8. Enhanced Assistant Configuration
CREATE TABLE IF NOT EXISTS public.assistant_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  assistant_id text UNIQUE,
  model text DEFAULT 'gpt-4o',
  instructions text,
  tools jsonb DEFAULT '[]',
  temperature numeric(3,2) DEFAULT 0.4,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tool_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  parameters jsonb NOT NULL,
  function_path text,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 9. i18n Support
CREATE TABLE IF NOT EXISTS public.i18n_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_key text NOT NULL,
  language text NOT NULL,
  content text NOT NULL,
  context text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(message_key, language)
);

-- 10. Business Intelligence & Campaign Management  
CREATE TABLE IF NOT EXISTS public.campaign_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid,
  name text,
  description text,
  segment_sql text,
  last_count integer,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid,
  wa_id text,
  lang text DEFAULT 'en',
  status text DEFAULT 'active',
  send_count integer DEFAULT 0,
  last_sent_at timestamptz
);

-- ===== RLS POLICIES =====

-- Contact Limits
ALTER TABLE contact_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System can manage contact limits" ON contact_limits FOR ALL USING (true);

-- Conversation Threads  
ALTER TABLE conversation_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System can manage conversation threads" ON conversation_threads FOR ALL USING (true);

-- Conversation Evaluations
ALTER TABLE conversation_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can view evaluations" ON conversation_evaluations FOR SELECT USING (is_admin());
CREATE POLICY "System can manage evaluations" ON conversation_evaluations FOR ALL USING (true);

-- Outbound Queue
ALTER TABLE outbound_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can view outbound queue" ON outbound_queue FOR SELECT USING (is_admin());
CREATE POLICY "System can manage outbound queue" ON outbound_queue FOR ALL USING (true);

-- Experiments
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage experiments" ON experiments FOR ALL USING (is_admin());

ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System can manage experiment assignments" ON experiment_assignments FOR ALL USING (true);

-- Quality & Training
ALTER TABLE fine_tune_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage fine tune jobs" ON fine_tune_jobs FOR ALL USING (is_admin());

ALTER TABLE evaluation_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can view evaluation results" ON evaluation_results FOR SELECT USING (is_admin());
CREATE POLICY "System can write evaluation results" ON evaluation_results FOR INSERT WITH CHECK (true);

-- Analytics
ALTER TABLE contact_timing_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_view_timing_patterns" ON contact_timing_patterns FOR SELECT USING (is_admin());
CREATE POLICY "system_manage_timing_patterns" ON contact_timing_patterns FOR ALL USING (true);

ALTER TABLE conversation_learning_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_view_learning_log" ON conversation_learning_log FOR SELECT USING (is_admin());
CREATE POLICY "system_manage_learning_log" ON conversation_learning_log FOR ALL USING (true);

ALTER TABLE fallback_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read fallback_logs" ON fallback_activity_log FOR SELECT USING (is_admin());
CREATE POLICY "System write fallback_logs" ON fallback_activity_log FOR INSERT WITH CHECK (true);

-- Assistant & Tools
ALTER TABLE assistant_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage assistant configs" ON assistant_configs FOR ALL USING (is_admin());

ALTER TABLE tool_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage tool definitions" ON tool_definitions FOR ALL USING (is_admin());

-- i18n
ALTER TABLE i18n_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage i18n messages" ON i18n_messages FOR ALL USING (is_admin());
CREATE POLICY "System can read i18n messages" ON i18n_messages FOR SELECT USING (true);

-- Campaign Management
ALTER TABLE campaign_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage segments" ON campaign_segments FOR ALL USING (is_admin());

ALTER TABLE campaign_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can view subscribers" ON campaign_subscribers FOR SELECT USING (is_admin());
CREATE POLICY "System can manage subscribers" ON campaign_subscribers FOR ALL USING (true);

-- ===== HELPER FUNCTIONS =====

-- Rate limiting check
CREATE OR REPLACE FUNCTION check_contact_limits(phone text, daily_limit int DEFAULT 50, weekly_limit int DEFAULT 200, monthly_limit int DEFAULT 500)
RETURNS boolean AS $$
DECLARE
  limits_record contact_limits;
BEGIN
  -- Get or create limits record
  SELECT * INTO limits_record FROM contact_limits WHERE phone_number = phone;
  
  IF NOT FOUND THEN
    INSERT INTO contact_limits (phone_number) VALUES (phone);
    RETURN true;
  END IF;
  
  -- Check if user has opted out
  IF limits_record.is_opted_out THEN
    RETURN false;
  END IF;
  
  -- Reset counters if needed
  IF limits_record.last_reset_daily < CURRENT_DATE THEN
    UPDATE contact_limits SET daily_count = 0, last_reset_daily = CURRENT_DATE WHERE phone_number = phone;
    limits_record.daily_count = 0;
  END IF;
  
  -- Check limits
  RETURN limits_record.daily_count < daily_limit 
    AND limits_record.weekly_count < weekly_limit 
    AND limits_record.monthly_count < monthly_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Language detection & i18n helper
CREATE OR REPLACE FUNCTION get_localized_message(key text, lang text DEFAULT 'en')
RETURNS text AS $$
DECLARE
  result text;
BEGIN
  SELECT content INTO result FROM i18n_messages 
  WHERE message_key = key AND language = lang;
  
  -- Fallback to English if not found
  IF result IS NULL THEN
    SELECT content INTO result FROM i18n_messages 
    WHERE message_key = key AND language = 'en';
  END IF;
  
  RETURN COALESCE(result, key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== INITIAL DATA =====

-- Insert default assistant configuration
INSERT INTO assistant_configs (name, model, instructions, tools) VALUES 
('easyMO Super-Agent', 'gpt-4o', 
'You are Rwanda''s most helpful commerce assistant inside WhatsApp. Goals: help drivers list trips, passengers book rides, vendors list or sell, shoppers buy, and collect payment via MoMo QR. Always be concise, friendly, and include Kinyarwanda greetings when user language=rw.',
'[
  {"type": "function", "function": {"name": "get_nearby_drivers", "description": "Return available driver trips near GPS coords", "parameters": {"type": "object", "properties": {"lat": {"type": "number"}, "lng": {"type": "number"}, "radius_km": {"type": "number", "default": 2}}, "required": ["lat", "lng"]}}},
  {"type": "function", "function": {"name": "create_booking", "description": "Confirm passenger-driver booking", "parameters": {"type": "object", "properties": {"driver_id": {"type": "string"}, "passenger_phone": {"type": "string"}, "pickup": {"type": "string"}, "dropoff": {"type": "string"}, "fare_rwf": {"type": "number"}}, "required": ["driver_id", "passenger_phone", "pickup", "dropoff"]}}},
  {"type": "function", "function": {"name": "list_properties", "description": "Search real estate listings", "parameters": {"type": "object", "properties": {"location": {"type": "string"}, "max_price": {"type": "number"}, "property_type": {"type": "string"}}}}}
]'::jsonb)
ON CONFLICT DO NOTHING;

-- Insert core tool definitions
INSERT INTO tool_definitions (name, description, parameters, function_path) VALUES
('get_nearby_drivers', 'Get available drivers near location', '{"type": "object", "properties": {"lat": {"type": "number"}, "lng": {"type": "number"}, "radius_km": {"type": "number"}}}', 'fn_get_nearby_drivers'),
('create_booking', 'Create a new booking', '{"type": "object", "properties": {"driver_id": {"type": "string"}, "passenger_phone": {"type": "string"}}}', 'create_booking'),
('list_properties', 'List real estate properties', '{"type": "object", "properties": {"location": {"type": "string"}, "max_price": {"type": "number"}}}', 'list_properties'),
('search_listings', 'Search product/service listings', '{"type": "object", "properties": {"query": {"type": "string"}, "category": {"type": "string"}}}', 'search_listings'),
('generate_payment_qr', 'Generate MoMo payment QR code', '{"type": "object", "properties": {"amount": {"type": "number"}, "reference": {"type": "string"}}}', 'generate-payment')
ON CONFLICT (name) DO NOTHING;

-- Insert basic i18n messages
INSERT INTO i18n_messages (message_key, language, content) VALUES
('greeting.welcome', 'en', 'Welcome to easyMO! How can I help you today?'),
('greeting.welcome', 'rw', 'Murakaza neza kuri easyMO! Ndasabwa ndagufashe ute?'),
('greeting.welcome', 'fr', 'Bienvenue sur easyMO! Comment puis-je vous aider?'),
('error.general', 'en', 'Sorry, I encountered an error. Please try again.'),
('error.general', 'rw', 'Ihangane, habaye ikosa. Ongera ugerageze.'),
('error.general', 'fr', 'Désolé, j''ai rencontré une erreur. Veuillez réessayer.')
ON CONFLICT (message_key, language) DO NOTHING;

-- Insert contact timing optimization data
INSERT INTO contact_timing_patterns (day_of_week, time_of_day, response_rate, engagement_score, success_rate) VALUES
(1, 9, 0.75, 0.85, 0.68),  -- Monday 9AM
(1, 14, 0.82, 0.79, 0.71), -- Monday 2PM
(2, 10, 0.78, 0.81, 0.69), -- Tuesday 10AM
(3, 15, 0.85, 0.88, 0.73), -- Wednesday 3PM
(4, 11, 0.79, 0.83, 0.70), -- Thursday 11AM
(5, 16, 0.77, 0.76, 0.65), -- Friday 4PM
(6, 10, 0.73, 0.74, 0.62)  -- Saturday 10AM
ON CONFLICT DO NOTHING;