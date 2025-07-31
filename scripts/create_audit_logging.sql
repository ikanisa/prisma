-- =======================================================================
-- PHASE 3: Production Hardening - Audit Logging System
-- =======================================================================

-- Create audit logging tables for comprehensive system monitoring

-- 1. Audit Logs Table
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

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_function_name ON audit_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);

-- 2. Security Events Table
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  function_name TEXT,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for security events
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);

-- 3. Performance Metrics Table
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

-- Indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_function_name ON performance_metrics(function_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_execution_time ON performance_metrics(execution_time_ms);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_status_code ON performance_metrics(status_code);

-- 4. Rate Limiting Table
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  function_name TEXT NOT NULL,
  requests_count INTEGER NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_key ON rate_limit_log(key);
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_function_name ON rate_limit_log(function_name);
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_window ON rate_limit_log(window_start, window_end);

-- 5. Function Health Metrics Table
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

-- Indexes for function health
CREATE INDEX IF NOT EXISTS idx_function_health_function_name ON function_health_metrics(function_name);
CREATE INDEX IF NOT EXISTS idx_function_health_status ON function_health_metrics(status);
CREATE INDEX IF NOT EXISTS idx_function_health_period ON function_health_metrics(period_start, period_end);

-- 6. RLS Policies for Audit Tables

-- Audit logs - System can manage, users can view their own
CREATE POLICY "System can manage audit logs" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Security events - System can manage, admin can view
CREATE POLICY "System can manage security events" ON security_events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Admin can view security events" ON security_events
  FOR SELECT USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');

-- Performance metrics - System can manage, admin can view
CREATE POLICY "System can manage performance metrics" ON performance_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Admin can view performance metrics" ON performance_metrics
  FOR SELECT USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');

-- Rate limit log - System can manage
CREATE POLICY "System can manage rate limit log" ON rate_limit_log
  FOR ALL USING (auth.role() = 'service_role');

-- Function health metrics - System can manage, admin can view
CREATE POLICY "System can manage function health metrics" ON function_health_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Admin can view function health metrics" ON function_health_metrics
  FOR SELECT USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');

-- 7. Enable RLS on all tables
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE function_health_metrics ENABLE ROW LEVEL SECURITY;

-- 8. Create cleanup functions for old data
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

-- 9. Create scheduled cleanup job
INSERT INTO cron_jobs (name, schedule, command, enabled)
VALUES (
  'cleanup_audit_logs',
  '0 2 * * *', -- Daily at 2 AM
  'SELECT cleanup_old_audit_logs();',
  true
) ON CONFLICT (name) DO UPDATE SET
  schedule = EXCLUDED.schedule,
  command = EXCLUDED.command,
  enabled = EXCLUDED.enabled;

-- 10. Create views for easy querying

-- Recent audit activity
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

-- Security events summary
CREATE OR REPLACE VIEW security_events_summary AS
SELECT 
  event_type,
  severity,
  COUNT(*) as event_count,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM security_events 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type, severity
ORDER BY severity DESC, event_count DESC;

-- Function performance summary
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