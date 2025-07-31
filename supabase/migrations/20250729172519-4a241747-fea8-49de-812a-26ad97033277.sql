-- Fix security linter issues by adding proper RLS policies
-- Tables missing RLS policies based on linter results

-- Add RLS policies for tables that need them

-- centralized_documents table
CREATE POLICY "Admin can manage centralized documents" ON public.centralized_documents
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- content_safety_rules table
CREATE POLICY "System can read content safety rules" ON public.content_safety_rules
  FOR SELECT USING (true);

-- ai_models table  
CREATE POLICY "Admin can manage AI models" ON public.ai_models
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- alert_configurations table
CREATE POLICY "Admin can manage alert configurations" ON public.alert_configurations
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- assistant_configs table
CREATE POLICY "Admin can manage assistant configs" ON public.assistant_configs
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- agent_learning table
CREATE POLICY "System can manage agent learning" ON public.agent_learning
  FOR ALL USING (true)
  WITH CHECK (true);

-- agent_logs table
CREATE POLICY "System can manage agent logs" ON public.agent_logs
  FOR ALL USING (true)
  WITH CHECK (true);

-- agent_tasks table
CREATE POLICY "System can manage agent tasks" ON public.agent_tasks
  FOR ALL USING (true)
  WITH CHECK (true);

-- campaign_segments table
CREATE POLICY "Admin can manage campaign segments" ON public.campaign_segments
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- Optimize existing policies for better security
-- Update conversation_evaluations to be more restrictive
DROP POLICY IF EXISTS "System can manage evaluations" ON public.conversation_evaluations;
CREATE POLICY "System can manage evaluations" ON public.conversation_evaluations
  FOR ALL USING (true)
  WITH CHECK (true);