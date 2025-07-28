-- Fixed Omni-Agent Learning System Database Migration
-- Creates tables for knowledge audit logs, gaps, coverage scores

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

-- Add missing columns to existing user_behavior_patterns table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_behavior_patterns' AND column_name='created_at') THEN
    ALTER TABLE public.user_behavior_patterns ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
END $$;

-- Add missing columns to existing learning_gap_instances table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='learning_gap_instances' AND column_name='identified_at') THEN
    ALTER TABLE public.learning_gap_instances ADD COLUMN identified_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
  
  -- Rename severity_level to severity if it exists and severity doesn't exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='learning_gap_instances' AND column_name='severity_level') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='learning_gap_instances' AND column_name='severity') THEN
    ALTER TABLE public.learning_gap_instances RENAME COLUMN severity_level TO severity;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.knowledge_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coverage_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access
CREATE POLICY "Admin can manage knowledge_audit_logs" ON public.knowledge_audit_logs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin can manage knowledge_gaps" ON public.knowledge_gaps
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin can manage coverage_scores" ON public.coverage_scores
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_audit_id ON public.knowledge_gaps(audit_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_status ON public.knowledge_gaps(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_severity ON public.knowledge_gaps(severity_level);
CREATE INDEX IF NOT EXISTS idx_coverage_scores_audit_id ON public.coverage_scores(audit_id);
CREATE INDEX IF NOT EXISTS idx_coverage_scores_domain ON public.coverage_scores(domain);

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