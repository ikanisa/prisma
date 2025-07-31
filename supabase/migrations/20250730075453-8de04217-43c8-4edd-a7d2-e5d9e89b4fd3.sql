-- Create QA and testing tables for Phase 4
CREATE TABLE IF NOT EXISTS public.qa_test_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_suite TEXT NOT NULL,
  total_tests INTEGER NOT NULL DEFAULT 0,
  passed_tests INTEGER NOT NULL DEFAULT 0,
  failed_tests INTEGER NOT NULL DEFAULT 0,
  execution_time_ms INTEGER,
  test_results JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create system validation logs table
CREATE TABLE IF NOT EXISTS public.system_validation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  validation_type TEXT NOT NULL,
  total_checks INTEGER NOT NULL DEFAULT 0,
  passed_checks INTEGER NOT NULL DEFAULT 0,
  failed_checks INTEGER NOT NULL DEFAULT 0,
  critical_failures INTEGER NOT NULL DEFAULT 0,
  validation_results JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create phase completion log table
CREATE TABLE IF NOT EXISTS public.phase_completion_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase TEXT NOT NULL,
  status TEXT NOT NULL,
  completion_details JSONB DEFAULT '{}'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.qa_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_validation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_completion_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for QA test runs
CREATE POLICY "System can manage QA test runs" 
ON public.qa_test_runs 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create RLS policies for system validation logs
CREATE POLICY "System can manage validation logs" 
ON public.system_validation_logs 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create RLS policies for phase completion log
CREATE POLICY "System can manage phase completion log" 
ON public.phase_completion_log 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qa_test_runs_status ON public.qa_test_runs(status);
CREATE INDEX IF NOT EXISTS idx_qa_test_runs_created_at ON public.qa_test_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_validation_logs_type ON public.system_validation_logs(validation_type);
CREATE INDEX IF NOT EXISTS idx_validation_logs_status ON public.system_validation_logs(status);
CREATE INDEX IF NOT EXISTS idx_phase_completion_phase ON public.phase_completion_log(phase);

-- Create function to auto-complete test runs
CREATE OR REPLACE FUNCTION public.complete_test_run()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for test run completion
CREATE TRIGGER auto_complete_test_run
  BEFORE UPDATE ON public.qa_test_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.complete_test_run();