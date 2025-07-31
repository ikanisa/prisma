-- Omni-Agent Learning System Database Migration
-- Creates tables for knowledge audit logs, gaps, coverage scores, and enhanced learning modules

-- Knowledge audit logs table
CREATE TABLE IF NOT EXISTS public.knowledge_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_by TEXT NOT NULL,
  model TEXT NOT NULL,
  audit_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  coverage_summary JSONB DEFAULT '{}',
  total_gaps_found INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Knowledge gaps table
CREATE TABLE IF NOT EXISTS public.knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES public.knowledge_audit_logs(id) ON DELETE CASCADE,
  gap_type TEXT NOT NULL,
  impacted_area TEXT NOT NULL,
  severity_level TEXT NOT NULL CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
  recommended_action TEXT,
  model_source TEXT NOT NULL,
  content_excerpt TEXT,
  fix_suggestion TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  assigned_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Coverage scores table
CREATE TABLE IF NOT EXISTS public.coverage_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES public.knowledge_audit_logs(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  missing_coverage JSONB DEFAULT '{}',
  model_evaluator TEXT NOT NULL,
  detailed_analysis JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User behavior patterns table (ensure it exists with proper structure)
CREATE TABLE IF NOT EXISTS public.user_behavior_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  pattern_type TEXT NOT NULL,
  pattern_data JSONB NOT NULL DEFAULT '{}',
  pattern_confidence NUMERIC DEFAULT 0.0 CHECK (pattern_confidence >= 0.0 AND pattern_confidence <= 1.0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Learning gaps instances table (for memory reinforcement)
CREATE TABLE IF NOT EXISTS public.learning_gap_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  user_id TEXT NOT NULL,
  gap_type TEXT NOT NULL,
  gap_description TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  identified_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'identified' CHECK (status IN ('identified', 'addressed', 'resolved'))
);

-- Enhance existing learning_modules table if needed
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='learning_modules' AND column_name='auto_tags') THEN
    ALTER TABLE public.learning_modules ADD COLUMN auto_tags TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='learning_modules' AND column_name='relevance_score') THEN
    ALTER TABLE public.learning_modules ADD COLUMN relevance_score NUMERIC DEFAULT 0.0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='learning_modules' AND column_name='vector_count') THEN
    ALTER TABLE public.learning_modules ADD COLUMN vector_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Enhance conversation_learning_log table if needed
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversation_learning_log' AND column_name='improvement_note') THEN
    ALTER TABLE public.conversation_learning_log ADD COLUMN improvement_note TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversation_learning_log' AND column_name='learning_summary') THEN
    ALTER TABLE public.conversation_learning_log ADD COLUMN learning_summary TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversation_learning_log' AND column_name='confidence_level') THEN
    ALTER TABLE public.conversation_learning_log ADD COLUMN confidence_level NUMERIC;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.knowledge_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coverage_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_behavior_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_gap_instances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access
CREATE POLICY "Admin can manage knowledge_audit_logs" ON public.knowledge_audit_logs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin can manage knowledge_gaps" ON public.knowledge_gaps
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin can manage coverage_scores" ON public.coverage_scores
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System can manage user_behavior_patterns" ON public.user_behavior_patterns
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System can manage learning_gap_instances" ON public.learning_gap_instances
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_audit_id ON public.knowledge_gaps(audit_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_status ON public.knowledge_gaps(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_severity ON public.knowledge_gaps(severity_level);
CREATE INDEX IF NOT EXISTS idx_coverage_scores_audit_id ON public.coverage_scores(audit_id);
CREATE INDEX IF NOT EXISTS idx_coverage_scores_domain ON public.coverage_scores(domain);
CREATE INDEX IF NOT EXISTS idx_user_behavior_patterns_user_id ON public.user_behavior_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_gap_instances_user_id ON public.learning_gap_instances(user_id);

-- Create RPC functions
CREATE OR REPLACE FUNCTION public.run_knowledge_audit(audit_type TEXT, run_by TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO public.knowledge_audit_logs (run_by, model, audit_type, status)
  VALUES (run_by, 'gpt-4o', audit_type, 'running')
  RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_gap(gap_id UUID, note TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.knowledge_gaps 
  SET status = 'resolved', 
      resolved_at = now(),
      fix_suggestion = COALESCE(fix_suggestion, '') || E'\n\nResolution: ' || note
  WHERE id = gap_id;
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_namespace(namespace TEXT, agent_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This will be implemented by the namespace-refresh edge function
  -- For now, just return true
  RETURN true;
END;
$$;