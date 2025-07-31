-- Advanced AI Ops Patch (P-02) - Quality, Performance, and Prediction Tables

-- QUALITY / PERFORMANCE MONITORING
CREATE TABLE IF NOT EXISTS public.agent_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT,
  execution_time_ms INTEGER,
  success_status BOOLEAN,
  user_id TEXT,
  model_used TEXT,
  input_data JSONB,
  error_details TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prediction_accuracy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  vendor_id TEXT,
  prediction_type TEXT,
  predicted_value TEXT,
  actual_value TEXT,
  prediction_date TIMESTAMPTZ,
  accuracy BOOLEAN
);

CREATE TABLE IF NOT EXISTS public.user_behavior_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  pattern_type TEXT,
  pattern_data JSONB,
  behavioral_score NUMERIC,
  pattern_confidence NUMERIC,
  last_analyzed TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Additional tables for timing optimization
CREATE TABLE IF NOT EXISTS public.contact_timing_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_of_day INTEGER, -- 0-23 hours
  day_of_week INTEGER, -- 0-6, Sunday=0
  success_rate NUMERIC,
  response_rate NUMERIC,
  engagement_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_learning_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  learning_summary TEXT,
  confidence_level NUMERIC,
  improvement_note TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.agent_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_accuracy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_behavior_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_timing_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_learning_log ENABLE ROW LEVEL SECURITY;

-- Admin-only access policies
CREATE POLICY "admin_view_execution_log" ON public.agent_execution_log
  FOR SELECT USING (is_admin());

CREATE POLICY "system_write_execution_log" ON public.agent_execution_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "admin_view_prediction_accuracy" ON public.prediction_accuracy
  FOR SELECT USING (is_admin());

CREATE POLICY "system_manage_prediction_accuracy" ON public.prediction_accuracy
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "admin_view_behavior_patterns" ON public.user_behavior_patterns
  FOR SELECT USING (is_admin());

CREATE POLICY "system_manage_behavior_patterns" ON public.user_behavior_patterns
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "admin_view_timing_patterns" ON public.contact_timing_patterns
  FOR SELECT USING (is_admin());

CREATE POLICY "system_manage_timing_patterns" ON public.contact_timing_patterns
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "admin_view_learning_log" ON public.conversation_learning_log
  FOR SELECT USING (is_admin());

CREATE POLICY "system_manage_learning_log" ON public.conversation_learning_log
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_execution_log_timestamp ON public.agent_execution_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_agent_execution_log_function ON public.agent_execution_log(function_name);
CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_user ON public.prediction_accuracy(user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_patterns_user ON public.user_behavior_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_timing_patterns_time ON public.contact_timing_patterns(time_of_day, day_of_week);