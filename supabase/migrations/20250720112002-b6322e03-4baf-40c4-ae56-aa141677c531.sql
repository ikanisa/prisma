-- Step 7: Advanced QA Framework Database Schema
-- Create comprehensive QA testing tables with RLS policies

-- QA Test Suites table
CREATE TABLE IF NOT EXISTS public.qa_test_suites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'integration', -- integration, performance, load, e2e
  status TEXT NOT NULL DEFAULT 'active',
  total_tests INTEGER DEFAULT 0,
  passed_tests INTEGER DEFAULT 0,
  failed_tests INTEGER DEFAULT 0,
  last_run_at TIMESTAMP WITH TIME ZONE,
  average_duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- QA Test Cases table  
CREATE TABLE IF NOT EXISTS public.qa_test_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suite_id UUID REFERENCES public.qa_test_suites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  test_data JSONB DEFAULT '{}',
  expected_result JSONB DEFAULT '{}',
  test_steps TEXT[],
  priority TEXT DEFAULT 'medium',
  tags TEXT[],
  timeout_ms INTEGER DEFAULT 30000,
  retry_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- QA Test Runs table
CREATE TABLE IF NOT EXISTS public.qa_test_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suite_id UUID REFERENCES public.qa_test_suites(id),
  test_case_id UUID REFERENCES public.qa_test_cases(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, passed, failed, timeout, error
  execution_time_ms INTEGER,
  actual_result JSONB,
  error_details TEXT,
  logs TEXT,
  environment TEXT DEFAULT 'development',
  triggered_by TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- QA Test Fixtures table
CREATE TABLE IF NOT EXISTS public.qa_test_fixtures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  fixture_data JSONB NOT NULL DEFAULT '{}',
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- QA Test Mocks table
CREATE TABLE IF NOT EXISTS public.qa_test_mocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  mock_config JSONB NOT NULL DEFAULT '{}',
  endpoint_pattern TEXT,
  response_data JSONB DEFAULT '{}',
  response_delay_ms INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Performance Benchmarks table
CREATE TABLE IF NOT EXISTS public.qa_performance_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  expected_value NUMERIC NOT NULL,
  tolerance_percent NUMERIC DEFAULT 10,
  unit TEXT NOT NULL,
  category TEXT DEFAULT 'response_time',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(test_name, metric_name)
);

-- QA Test Reports table
CREATE TABLE IF NOT EXISTS public.qa_test_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suite_id UUID REFERENCES public.qa_test_suites(id),
  run_id UUID,
  report_type TEXT DEFAULT 'execution_summary',
  title TEXT NOT NULL,
  summary JSONB DEFAULT '{}',
  details JSONB DEFAULT '{}',
  generated_by TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.qa_test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_test_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_test_mocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_performance_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_test_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access
CREATE POLICY "Admin full access to qa_test_suites" ON public.qa_test_suites
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin full access to qa_test_cases" ON public.qa_test_cases
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin full access to qa_test_runs" ON public.qa_test_runs
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin full access to qa_test_fixtures" ON public.qa_test_fixtures
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin full access to qa_test_mocks" ON public.qa_test_mocks
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin full access to qa_performance_benchmarks" ON public.qa_performance_benchmarks
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin full access to qa_test_reports" ON public.qa_test_reports
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Create system policies for edge functions
CREATE POLICY "System manage qa_test_suites" ON public.qa_test_suites
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System manage qa_test_cases" ON public.qa_test_cases
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System manage qa_test_runs" ON public.qa_test_runs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System manage qa_test_fixtures" ON public.qa_test_fixtures
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System manage qa_test_mocks" ON public.qa_test_mocks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System manage qa_performance_benchmarks" ON public.qa_performance_benchmarks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System manage qa_test_reports" ON public.qa_test_reports
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qa_test_cases_suite_id ON public.qa_test_cases(suite_id);
CREATE INDEX IF NOT EXISTS idx_qa_test_runs_suite_id ON public.qa_test_runs(suite_id);
CREATE INDEX IF NOT EXISTS idx_qa_test_runs_test_case_id ON public.qa_test_runs(test_case_id);
CREATE INDEX IF NOT EXISTS idx_qa_test_runs_status ON public.qa_test_runs(status);
CREATE INDEX IF NOT EXISTS idx_qa_test_runs_started_at ON public.qa_test_runs(started_at);
CREATE INDEX IF NOT EXISTS idx_qa_performance_benchmarks_test_name ON public.qa_performance_benchmarks(test_name);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update triggers
CREATE TRIGGER update_qa_test_suites_updated_at
  BEFORE UPDATE ON public.qa_test_suites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qa_test_cases_updated_at
  BEFORE UPDATE ON public.qa_test_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qa_test_fixtures_updated_at
  BEFORE UPDATE ON public.qa_test_fixtures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qa_test_mocks_updated_at
  BEFORE UPDATE ON public.qa_test_mocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qa_performance_benchmarks_updated_at
  BEFORE UPDATE ON public.qa_performance_benchmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();