-- Production monitoring and alerting tables
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  memory_usage JSONB NOT NULL DEFAULT '{}',
  request_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  avg_response_time INTEGER DEFAULT 0,
  active_connections INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  service TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.health_check_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overall_status TEXT NOT NULL CHECK (overall_status IN ('healthy', 'unhealthy', 'degraded')),
  checks JSONB NOT NULL DEFAULT '[]',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON public.system_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON public.system_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON public.system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_unresolved ON public.system_alerts(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_health_check_timestamp ON public.health_check_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_health_check_status ON public.health_check_history(overall_status);

-- Enable RLS
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_check_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin can view system metrics" ON public.system_metrics
  FOR SELECT USING (is_admin());

CREATE POLICY "System can insert metrics" ON public.system_metrics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can manage alerts" ON public.system_alerts
  FOR ALL USING (is_admin());

CREATE POLICY "System can create alerts" ON public.system_alerts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can view health history" ON public.health_check_history
  FOR SELECT USING (is_admin());

CREATE POLICY "System can insert health checks" ON public.health_check_history
  FOR INSERT WITH CHECK (true);

-- Function to cleanup old monitoring data
CREATE OR REPLACE FUNCTION cleanup_monitoring_data()
RETURNS void AS $$
BEGIN
  -- Keep metrics for 30 days
  DELETE FROM public.system_metrics 
  WHERE timestamp < now() - INTERVAL '30 days';
  
  -- Keep resolved alerts for 90 days
  DELETE FROM public.system_alerts 
  WHERE resolved = true AND resolved_at < now() - INTERVAL '90 days';
  
  -- Keep health history for 7 days
  DELETE FROM public.health_check_history 
  WHERE timestamp < now() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create materialized view for monitoring dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS public.monitoring_dashboard AS
SELECT 
  'metrics' as type,
  COUNT(*) as total_records,
  MIN(timestamp) as earliest_record,
  MAX(timestamp) as latest_record,
  AVG((memory_usage->>'heap_used')::numeric) as avg_memory_usage,
  AVG(request_count) as avg_requests,
  AVG(error_count) as avg_errors
FROM public.system_metrics
WHERE timestamp > now() - INTERVAL '24 hours'
UNION ALL
SELECT 
  'alerts' as type,
  COUNT(*) as total_records,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record,
  COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count,
  COUNT(CASE WHEN resolved = false THEN 1 END) as unresolved_count,
  COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_count
FROM public.system_alerts
WHERE created_at > now() - INTERVAL '24 hours';

-- Refresh function for the materialized view
CREATE OR REPLACE FUNCTION refresh_monitoring_dashboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.monitoring_dashboard;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;