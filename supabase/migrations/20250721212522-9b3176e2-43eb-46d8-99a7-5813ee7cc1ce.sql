-- Production monitoring and alerting tables (fixed)
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_metrics_created_at ON public.system_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON public.system_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON public.system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_unresolved ON public.system_alerts(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_health_check_created_at ON public.health_check_history(created_at DESC);
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