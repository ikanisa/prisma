-- =======================================================================
-- CRITICAL FIX: RLS Policies for Locked Tables
-- =======================================================================
-- This script fixes 24 tables that have RLS enabled but no policies
-- making them completely inaccessible. These policies restore functionality.

-- System tables (service role access only)
CREATE POLICY "System can manage agent_performance_metrics" 
ON agent_performance_metrics 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage cron_jobs" 
ON cron_jobs 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage data_sync_runs" 
ON data_sync_runs 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage drip_sequences" 
ON drip_sequences 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage drip_steps" 
ON drip_steps 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage edge_function_config" 
ON edge_function_config 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage experiments" 
ON experiments 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage farmers" 
ON farmers 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage fine_tune_jobs" 
ON fine_tune_jobs 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage hardware_vendors" 
ON hardware_vendors 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage knowledge_base" 
ON knowledge_base 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage marketing_campaigns" 
ON marketing_campaigns 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage mcp_model_registry" 
ON mcp_model_registry 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage model_benchmarks" 
ON model_benchmarks 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage model_experiments" 
ON model_experiments 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage module_reviews" 
ON module_reviews 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage qa_test_scenarios" 
ON qa_test_scenarios 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage stress_test_results" 
ON stress_test_results 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage test_cases" 
ON test_cases 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage test_fixtures" 
ON test_fixtures 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage test_mocks" 
ON test_mocks 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage test_suites" 
ON test_suites 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage tool_definitions" 
ON tool_definitions 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage vector_store" 
ON vector_store 
FOR ALL USING (auth.role() = 'service_role');

-- =======================================================================
-- Verification Query
-- =======================================================================
-- Run this to verify all tables now have policies:
/*
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN (
    'agent_performance_metrics',
    'cron_jobs',
    'data_sync_runs',
    'drip_sequences',
    'drip_steps',
    'edge_function_config',
    'experiments',
    'farmers',
    'fine_tune_jobs',
    'hardware_vendors',
    'knowledge_base',
    'marketing_campaigns',
    'mcp_model_registry',
    'model_benchmarks',
    'model_experiments',
    'module_reviews',
    'qa_test_scenarios',
    'stress_test_results',
    'test_cases',
    'test_fixtures',
    'test_mocks',
    'test_suites',
    'tool_definitions',
    'vector_store'
  )
ORDER BY tablename;
*/ 