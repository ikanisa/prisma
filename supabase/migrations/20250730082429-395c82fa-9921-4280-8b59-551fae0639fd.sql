-- Check and fix only missing elements for Omni-Agent system

-- Create conversation_state table if not exists
CREATE TABLE IF NOT EXISTS public.conversation_state (
  user_id text PRIMARY KEY,
  current_stage text DEFAULT 'initial',
  last_intent text,
  confidence real DEFAULT 0.0,
  context_data jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create quality_feedback table if not exists
CREATE TABLE IF NOT EXISTS public.quality_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  original_response text NOT NULL,
  patched_response text,
  patch_reason text,
  quality_score real DEFAULT 0.0,
  model_used text DEFAULT 'gpt-4o',
  created_at timestamp with time zone DEFAULT now()
);

-- Create live_handoffs table if not exists
CREATE TABLE IF NOT EXISTS public.live_handoffs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'resolved')),
  operator_id text,
  context_data jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone
);

-- Create system_metrics table if not exists
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  measurement_period text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS only if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'conversation_state' AND rowsecurity = true) THEN
    ALTER TABLE public.conversation_state ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'quality_feedback' AND rowsecurity = true) THEN
    ALTER TABLE public.quality_feedback ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'live_handoffs' AND rowsecurity = true) THEN
    ALTER TABLE public.live_handoffs ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'system_metrics' AND rowsecurity = true) THEN
    ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;

-- Create RLS policies only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversation_state' AND policyname = 'System can manage conversation_state') THEN
    CREATE POLICY "System can manage conversation_state" 
    ON public.conversation_state FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quality_feedback' AND policyname = 'System can manage quality_feedback') THEN
    CREATE POLICY "System can manage quality_feedback" 
    ON public.quality_feedback FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'live_handoffs' AND policyname = 'System can manage live_handoffs') THEN
    CREATE POLICY "System can manage live_handoffs" 
    ON public.live_handoffs FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_metrics' AND policyname = 'System can manage system_metrics') THEN
    CREATE POLICY "System can manage system_metrics" 
    ON public.system_metrics FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_state_stage 
ON public.conversation_state(current_stage, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_quality_feedback_score 
ON public.quality_feedback(quality_score, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_handoffs_status 
ON public.live_handoffs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_metrics_name_period 
ON public.system_metrics(metric_name, measurement_period, created_at DESC);