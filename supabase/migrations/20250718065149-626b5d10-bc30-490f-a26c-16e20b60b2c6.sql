-- AI-Ops Patch P-04: Observability + Memory + Model Control Tables

-- 1️⃣ Trace & Logs
CREATE TABLE IF NOT EXISTS public.telegram_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT,
  message_content TEXT,
  processed BOOLEAN DEFAULT false,
  received_at TIMESTAMPTZ DEFAULT now()
);

-- 2️⃣ Memory + Learning
CREATE TABLE IF NOT EXISTS public.agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  memory_type TEXT,
  memory_value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_gap_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  gap_category TEXT,
  gap_description TEXT,
  severity_level TEXT,
  context_excerpt TEXT,
  suggested_improvement TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3️⃣ Model Control Plane
CREATE TABLE IF NOT EXISTS public.mcp_model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name TEXT UNIQUE,
  primary_model TEXT,
  secondary_model TEXT,
  fallback_model TEXT,
  prompt_prefix TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.model_output_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT,
  model_used TEXT,
  prompt_text TEXT,
  response_text TEXT,
  token_usage INTEGER,
  execution_time_ms INTEGER,
  response_quality TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fallback_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_model TEXT,
  fallback_model TEXT,
  trigger_reason TEXT,
  task_type TEXT,
  success BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4️⃣ Enable RLS
ALTER TABLE public.telegram_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_gap_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_output_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fallback_activity_log ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admin read telegram_logs" ON public.telegram_logs FOR SELECT USING (is_admin());
CREATE POLICY "Admin read agent_memory" ON public.agent_memory FOR SELECT USING (is_admin());
CREATE POLICY "Admin read learning_gaps" ON public.learning_gap_instances FOR SELECT USING (is_admin());
CREATE POLICY "Admin all mcp_registry" ON public.mcp_model_registry FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin read model_logs" ON public.model_output_logs FOR SELECT USING (is_admin());
CREATE POLICY "Admin read fallback_logs" ON public.fallback_activity_log FOR SELECT USING (is_admin());

-- System policies for edge functions
CREATE POLICY "System write telegram_logs" ON public.telegram_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "System manage agent_memory" ON public.agent_memory FOR ALL WITH CHECK (true);
CREATE POLICY "System write learning_gaps" ON public.learning_gap_instances FOR INSERT WITH CHECK (true);
CREATE POLICY "System write model_logs" ON public.model_output_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "System write fallback_logs" ON public.fallback_activity_log FOR INSERT WITH CHECK (true);