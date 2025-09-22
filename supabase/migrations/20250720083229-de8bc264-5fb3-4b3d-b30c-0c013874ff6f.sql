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
ALTER TABLE public.training_data_export ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_consolidation_log ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admin can manage training data" ON public.training_data_export FOR ALL USING (is_admin());
CREATE POLICY "Admin can manage evaluation cases" ON public.evaluation_test_cases FOR ALL USING (is_admin());
CREATE POLICY "Admin can view memory logs" ON public.memory_consolidation_log FOR SELECT USING (is_admin());

-- System policies
CREATE POLICY "System can manage training data" ON public.training_data_export FOR ALL USING (true);
CREATE POLICY "System can manage evaluation cases" ON public.evaluation_test_cases FOR ALL USING (true);
CREATE POLICY "System can manage memory logs" ON public.memory_consolidation_log FOR ALL USING (true);

-- Indexes
CREATE INDEX idx_training_data_score ON public.training_data_export(quality_score DESC);
CREATE INDEX idx_training_data_status ON public.training_data_export(status);
CREATE INDEX idx_evaluation_category ON public.evaluation_test_cases(test_category, status);
CREATE INDEX idx_memory_user_id ON public.memory_consolidation_log(user_id);
CREATE INDEX idx_memory_consolidated_at ON public.memory_consolidation_log(consolidated_at DESC);

-- Insert default evaluation test cases
INSERT INTO public.evaluation_test_cases (test_name, test_prompt, expected_output, test_category) VALUES
('greeting_test_rw', 'Muraho', 'Should respond with Kinyarwanda greeting', 'language_detection'),
('booking_intent', 'I need a ride from Kimisagara to town', 'Should trigger get_nearby_drivers function', 'intent_recognition'),
('payment_request', 'Generate QR for 1000 RWF payment', 'Should trigger generate_qr function', 'tool_calling');