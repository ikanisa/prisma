-- Tool definitions for dynamic function loading
CREATE TABLE public.tool_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  function_name text NOT NULL,
  status text DEFAULT 'active'::text CHECK (status IN ('active', 'inactive', 'deprecated')),
  version text DEFAULT '1.0'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Model registry for fine-tuning and fallbacks
CREATE TABLE public.mcp_model_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  model_type text NOT NULL CHECK (model_type IN ('primary', 'secondary', 'fine_tuned')),
  openai_model_id text NOT NULL,
  fine_tune_job_id text,
  performance_metrics jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'active'::text CHECK (status IN ('active', 'inactive', 'training')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Training data export for fine-tuning pipeline
CREATE TABLE public.training_data_export (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid,
  user_message text NOT NULL,
  assistant_message text NOT NULL,
  quality_score numeric DEFAULT 0,
  exported_at timestamp with time zone DEFAULT now(),
  fine_tune_job_id text,
  status text DEFAULT 'pending'::text CHECK (status IN ('pending', 'exported', 'used'))
);

-- Evaluation test cases for OpenAI Evals
CREATE TABLE public.evaluation_test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name text NOT NULL,
  test_prompt text NOT NULL,
  expected_output text,
  test_category text NOT NULL,
  model_version text,
  last_run_at timestamp with time zone,
  last_score numeric,
  status text DEFAULT 'active'::text CHECK (status IN ('active', 'inactive')),
  created_at timestamp with time zone DEFAULT now()
);

-- Memory consolidation log for conversation summarization
CREATE TABLE public.memory_consolidation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid,
  user_id text,
  summary_text text NOT NULL,
  key_insights jsonb DEFAULT '{}'::jsonb,
  consolidated_at timestamp with time zone DEFAULT now(),
  vector_stored boolean DEFAULT false,
  pinecone_id text
);

-- RLS Policies
ALTER TABLE public.tool_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_data_export ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_consolidation_log ENABLE ROW LEVEL SECURITY;

-- Admin can manage all tables
CREATE POLICY "Admin can manage tool definitions" ON public.tool_definitions FOR ALL USING (is_admin());
CREATE POLICY "Admin can manage model registry" ON public.mcp_model_registry FOR ALL USING (is_admin());
CREATE POLICY "Admin can manage training data" ON public.training_data_export FOR ALL USING (is_admin());
CREATE POLICY "Admin can manage evaluation cases" ON public.evaluation_test_cases FOR ALL USING (is_admin());
CREATE POLICY "Admin can view memory logs" ON public.memory_consolidation_log FOR SELECT USING (is_admin());

-- System can manage data
CREATE POLICY "System can manage tool definitions" ON public.tool_definitions FOR ALL USING (true);
CREATE POLICY "System can manage model registry" ON public.mcp_model_registry FOR ALL USING (true);
CREATE POLICY "System can manage training data" ON public.training_data_export FOR ALL USING (true);
CREATE POLICY "System can manage evaluation cases" ON public.evaluation_test_cases FOR ALL USING (true);
CREATE POLICY "System can manage memory logs" ON public.memory_consolidation_log FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX idx_tool_definitions_status ON public.tool_definitions(status);
CREATE INDEX idx_tool_definitions_name ON public.tool_definitions(name);
CREATE INDEX idx_model_registry_type ON public.mcp_model_registry(model_type, status);
CREATE INDEX idx_training_data_score ON public.training_data_export(quality_score DESC);
CREATE INDEX idx_training_data_status ON public.training_data_export(status);
CREATE INDEX idx_evaluation_category ON public.evaluation_test_cases(test_category, status);
CREATE INDEX idx_memory_user_id ON public.memory_consolidation_log(user_id);
CREATE INDEX idx_memory_consolidated_at ON public.memory_consolidation_log(consolidated_at DESC);

-- Insert default tool definitions
INSERT INTO public.tool_definitions (name, description, parameters, function_name) VALUES
('get_nearby_drivers', 'Return available driver trips near GPS coordinates', 
 '{"type":"object","properties":{"lat":{"type":"number"},"lng":{"type":"number"},"radius_km":{"type":"number","default":2}},"required":["lat","lng"]}',
 'get_nearby_drivers'),
('create_booking', 'Confirm passenger-driver booking',
 '{"type":"object","properties":{"driver_id":{"type":"string"},"passenger_phone":{"type":"string"},"pickup":{"type":"string"},"dropoff":{"type":"string"},"fare_rwf":{"type":"number"}},"required":["driver_id","passenger_phone","pickup","dropoff"]}',
 'create_booking'),
('search_listings', 'Search product/property listings',
 '{"type":"object","properties":{"query":{"type":"string"},"category":{"type":"string"},"location":{"type":"string"}},"required":["query"]}',
 'search_listings'),
('generate_qr', 'Generate payment QR code',
 '{"type":"object","properties":{"amount":{"type":"number"},"phone":{"type":"string"},"description":{"type":"string"}},"required":["amount","phone"]}',
 'generate_qr');

-- Insert default model registry
INSERT INTO public.mcp_model_registry (model_name, model_type, openai_model_id) VALUES
('primary_assistant', 'primary', 'gpt-4o'),
('quality_gate', 'secondary', 'gpt-4o-mini'),
('fallback_chat', 'secondary', 'gpt-3.5-turbo');

-- Insert default evaluation test cases
INSERT INTO public.evaluation_test_cases (test_name, test_prompt, expected_output, test_category) VALUES
('greeting_test_rw', 'Muraho', 'Should respond with Kinyarwanda greeting', 'language_detection'),
('booking_intent', 'I need a ride from Kimisagara to town', 'Should trigger get_nearby_drivers function', 'intent_recognition'),
('payment_request', 'Generate QR for 1000 RWF payment', 'Should trigger generate_qr function', 'tool_calling');