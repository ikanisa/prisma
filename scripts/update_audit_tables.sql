-- =======================================================================
-- PHASE 3: Update Existing Audit Tables
-- =======================================================================

-- Update existing security_events table to add missing columns
ALTER TABLE security_events 
ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS function_name TEXT,
ADD COLUMN IF NOT EXISTS ip_address INET;

-- Update existing rate_limit_log table to add missing columns
ALTER TABLE rate_limit_log 
ADD COLUMN IF NOT EXISTS key TEXT,
ADD COLUMN IF NOT EXISTS function_name TEXT,
ADD COLUMN IF NOT EXISTS requests_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS window_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS window_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Create missing tables that don't exist
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address INET,
  user_agent TEXT,
  request_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  memory_usage_mb DECIMAL(10,2),
  request_id TEXT,
  user_id UUID,
  status_code INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS function_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  response_time_ms INTEGER,
  error_rate DECIMAL(5,4),
  success_rate DECIMAL(5,4),
  total_requests INTEGER,
  failed_requests INTEGER,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_audit_logs_function_name ON audit_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_function_name ON performance_metrics(function_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_execution_time ON performance_metrics(execution_time_ms);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_status_code ON performance_metrics(status_code);

CREATE INDEX IF NOT EXISTS idx_function_health_function_name ON function_health_metrics(function_name);
CREATE INDEX IF NOT EXISTS idx_function_health_status ON function_health_metrics(status);
CREATE INDEX IF NOT EXISTS idx_function_health_period ON function_health_metrics(period_start, period_end);

-- Add indexes to existing tables
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_function_name ON security_events(function_name);
CREATE INDEX IF NOT EXISTS idx_security_events_ip_address ON security_events(ip_address);

CREATE INDEX IF NOT EXISTS idx_rate_limit_log_key ON rate_limit_log(key);
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_function_name ON rate_limit_log(function_name);
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_window ON rate_limit_log(window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_ip_address ON rate_limit_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_user_id ON rate_limit_log(user_id);

-- Enable RLS on new tables
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE function_health_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
CREATE POLICY "System can manage audit logs" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage performance metrics" ON performance_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Admin can view performance metrics" ON performance_metrics
  FOR SELECT USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "System can manage function health metrics" ON function_health_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Admin can view function health metrics" ON function_health_metrics
  FOR SELECT USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  -- Keep audit logs for 90 days
  DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Keep security events for 1 year
  DELETE FROM security_events WHERE created_at < NOW() - INTERVAL '1 year';
  
  -- Keep performance metrics for 30 days
  DELETE FROM performance_metrics WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Keep rate limit logs for 7 days
  DELETE FROM rate_limit_log WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- Keep function health metrics for 90 days
  DELETE FROM function_health_metrics WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create views for easy querying
CREATE OR REPLACE VIEW recent_audit_activity AS
SELECT 
  function_name,
  action,
  COUNT(*) as event_count,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM audit_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY function_name, action
ORDER BY event_count DESC;

CREATE OR REPLACE VIEW security_events_summary AS
SELECT 
  event_type,
  COALESCE(severity, 'medium') as severity,
  COUNT(*) as event_count,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM security_events 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type, severity
ORDER BY severity DESC, event_count DESC;

CREATE OR REPLACE VIEW function_performance_summary AS
SELECT 
  function_name,
  AVG(execution_time_ms) as avg_execution_time,
  MAX(execution_time_ms) as max_execution_time,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status_code >= 400) as failed_requests,
  ROUND(
    (COUNT(*) FILTER (WHERE status_code >= 400)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2
  ) as error_rate_percent
FROM performance_metrics 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY function_name
ORDER BY avg_execution_time DESC;

-- Grant permissions
GRANT SELECT ON recent_audit_activity TO authenticated;
GRANT SELECT ON security_events_summary TO authenticated;
GRANT SELECT ON function_performance_summary TO authenticated; 