-- Step 6A: Test Framework Database Schema
-- Create comprehensive test framework tables and functions

-- Test suites for organizing tests
CREATE TABLE IF NOT EXISTS public.test_suites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT DEFAULT 'unit' CHECK (category IN ('unit', 'integration', 'e2e')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual test cases
CREATE TABLE IF NOT EXISTS public.test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id UUID REFERENCES public.test_suites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  test_function TEXT NOT NULL, -- Edge function to call
  test_data JSONB DEFAULT '{}'::jsonb,
  expected_result JSONB,
  timeout_ms INTEGER DEFAULT 30000,
  retry_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(suite_id, name)
);

-- Test execution results
CREATE TABLE IF NOT EXISTS public.test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id UUID REFERENCES public.test_suites(id),
  test_case_id UUID REFERENCES public.test_cases(id),
  execution_id UUID NOT NULL, -- Groups all tests in a single run
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'passed', 'failed', 'timeout', 'error')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  execution_time_ms INTEGER,
  actual_result JSONB,
  error_details TEXT,
  logs TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test fixtures for data setup/teardown
CREATE TABLE IF NOT EXISTS public.test_fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  setup_sql TEXT, -- SQL to run before tests
  teardown_sql TEXT, -- SQL to run after tests
  test_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mock configurations for external APIs
CREATE TABLE IF NOT EXISTS public.test_mocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL, -- 'whatsapp', 'openai', etc.
  endpoint_pattern TEXT NOT NULL,
  method TEXT DEFAULT 'POST',
  mock_response JSONB NOT NULL,
  response_delay_ms INTEGER DEFAULT 0,
  status_code INTEGER DEFAULT 200,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_name, endpoint_pattern, method)
);

-- Performance benchmarks
CREATE TABLE IF NOT EXISTS public.performance_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('cold_start', 'warm_execution', 'load_test')),
  execution_time_ms INTEGER NOT NULL,
  memory_usage_mb NUMERIC,
  cpu_usage_percent NUMERIC,
  request_count INTEGER DEFAULT 1,
  concurrent_requests INTEGER DEFAULT 1,
  success_rate NUMERIC DEFAULT 100.0,
  error_details TEXT,
  test_timestamp TIMESTAMPTZ DEFAULT NOW(),
  environment TEXT DEFAULT 'test'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_runs_execution_id ON public.test_runs(execution_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_suite_id ON public.test_runs(suite_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_status ON public.test_runs(status);
CREATE INDEX IF NOT EXISTS idx_test_runs_completed_at ON public.test_runs(completed_at);
CREATE INDEX IF NOT EXISTS idx_performance_benchmarks_function ON public.performance_benchmarks(function_name);
CREATE INDEX IF NOT EXISTS idx_performance_benchmarks_type ON public.performance_benchmarks(test_type);
CREATE INDEX IF NOT EXISTS idx_performance_benchmarks_timestamp ON public.performance_benchmarks(test_timestamp);

-- RLS Policies
ALTER TABLE public.test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_mocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_benchmarks ENABLE ROW LEVEL SECURITY;

-- Admin access to all test tables
CREATE POLICY "Admin manage test suites" ON public.test_suites FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin manage test cases" ON public.test_cases FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin manage test runs" ON public.test_runs FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin manage test fixtures" ON public.test_fixtures FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin manage test mocks" ON public.test_mocks FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin manage performance benchmarks" ON public.performance_benchmarks FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- System access for test execution
CREATE POLICY "System manage test runs" ON public.test_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System manage performance benchmarks" ON public.performance_benchmarks FOR ALL USING (true) WITH CHECK (true);

-- Function to clean test data
CREATE OR REPLACE FUNCTION clean_test_data()
RETURNS void AS $$
BEGIN
  -- Clean up test-specific data
  DELETE FROM public.conversation_messages WHERE phone_number LIKE 'test_%';
  DELETE FROM public.conversation_analytics WHERE phone_number LIKE 'test_%';
  DELETE FROM public.whatsapp_delivery_metrics WHERE phone_number LIKE 'test_%';
  DELETE FROM public.conversation_flows WHERE phone_number LIKE 'test_%';
  
  -- Reset sequences if needed
  -- Add more cleanup as needed
  
  RAISE NOTICE 'Test data cleaned successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate test phone numbers
CREATE OR REPLACE FUNCTION generate_test_phone()
RETURNS text AS $$
BEGIN
  RETURN 'test_' || floor(random() * 1000000)::text;
END;
$$ LANGUAGE plpgsql;