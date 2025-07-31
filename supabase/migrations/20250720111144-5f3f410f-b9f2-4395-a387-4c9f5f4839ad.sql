-- Step 6B: Cron Jobs & Monitoring System Database Schema (Fixed v2)
-- Create comprehensive monitoring and automation infrastructure

-- Cron job schedules and configurations
CREATE TABLE IF NOT EXISTS public.cron_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  function_name TEXT NOT NULL,
  schedule_expression TEXT NOT NULL,
  parameters JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_execution TIMESTAMPTZ,
  next_execution TIMESTAMPTZ,
  execution_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 300,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cron job execution history
CREATE TABLE IF NOT EXISTS public.cron_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.cron_jobs(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'timeout')),
  execution_time_ms INTEGER,
  result_data JSONB,
  error_details TEXT,
  retry_attempt INTEGER DEFAULT 0
);

-- Marketing campaigns for automated messaging
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('drip', 'broadcast', 'triggered')),
  target_audience JSONB NOT NULL,
  message_template TEXT NOT NULL,
  template_variables JSONB DEFAULT '{}'::jsonb,
  schedule_config JSONB NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_responses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign message queue
CREATE TABLE IF NOT EXISTS public.campaign_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'responded')),
  attempt_count INTEGER DEFAULT 0,
  error_details TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- System health monitoring alerts
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('performance', 'error_rate', 'uptime', 'memory', 'custom')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  metric_name TEXT,
  current_value NUMERIC,
  threshold_value NUMERIC,
  source_function TEXT,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- System health metrics collection
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'histogram')),
  value NUMERIC NOT NULL,
  labels JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT
);

-- Alert notification configurations
CREATE TABLE IF NOT EXISTS public.alert_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  alert_types TEXT[] NOT NULL,
  severity_levels TEXT[] NOT NULL,
  notification_channels JSONB NOT NULL,
  throttle_minutes INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drip sequence definitions
CREATE TABLE IF NOT EXISTS public.drip_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  trigger_conditions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual steps in drip sequences
CREATE TABLE IF NOT EXISTS public.drip_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES public.drip_sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  delay_hours INTEGER NOT NULL,
  message_template TEXT NOT NULL,
  template_variables JSONB DEFAULT '{}'::jsonb,
  conditions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(sequence_id, step_order)
);

-- User enrollment in drip sequences
CREATE TABLE IF NOT EXISTS public.drip_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES public.drip_sequences(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  current_step INTEGER DEFAULT 0,
  next_message_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(sequence_id, phone_number)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_cron_jobs_next_execution ON public.cron_jobs(next_execution) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cron_executions_job_started ON public.cron_executions(job_id, started_at);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_scheduled ON public.campaign_messages(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign ON public.campaign_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON public.system_alerts(status, triggered_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_recorded ON public.system_metrics(metric_name, recorded_at);
CREATE INDEX IF NOT EXISTS idx_drip_enrollments_next_message ON public.drip_enrollments(next_message_at) WHERE status = 'active';

-- RLS Policies
ALTER TABLE public.cron_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drip_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drip_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drip_enrollments ENABLE ROW LEVEL SECURITY;

-- Admin access policies
CREATE POLICY "Admin manage cron jobs" ON public.cron_jobs FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin manage cron executions" ON public.cron_executions FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin manage marketing campaigns" ON public.marketing_campaigns FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin manage campaign messages" ON public.campaign_messages FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin manage system alerts" ON public.system_alerts FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin manage system metrics" ON public.system_metrics FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin manage alert configurations" ON public.alert_configurations FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin manage drip sequences" ON public.drip_sequences FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin manage drip steps" ON public.drip_steps FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin manage drip enrollments" ON public.drip_enrollments FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- System access policies
CREATE POLICY "System manage cron executions" ON public.cron_executions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System manage campaign messages" ON public.campaign_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System manage system alerts" ON public.system_alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System manage system metrics" ON public.system_metrics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System manage drip enrollments" ON public.drip_enrollments FOR ALL USING (true) WITH CHECK (true);