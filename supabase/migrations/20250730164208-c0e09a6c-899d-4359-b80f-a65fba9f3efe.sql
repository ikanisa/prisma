-- Create enhanced template logging and A/B testing infrastructure

-- Table for A/B testing configurations
CREATE TABLE IF NOT EXISTS template_ab_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  variant_a_template TEXT NOT NULL,
  variant_b_template TEXT NOT NULL,
  traffic_split NUMERIC DEFAULT 0.5, -- 0.5 = 50/50 split
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  target_metric TEXT DEFAULT 'conversion_rate',
  minimum_sample_size INTEGER DEFAULT 100,
  confidence_threshold NUMERIC DEFAULT 0.95,
  winner TEXT, -- 'A', 'B', or NULL
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enhanced template sends table with better metadata structure
ALTER TABLE template_sends 
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS error_code TEXT,
ADD COLUMN IF NOT EXISTS user_segment TEXT,
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS ab_test_id UUID REFERENCES template_ab_tests(id),
ADD COLUMN IF NOT EXISTS variant TEXT; -- 'A' or 'B' for A/B tests

-- Table for template performance metrics (aggregated data for faster queries)
CREATE TABLE IF NOT EXISTS template_performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  date DATE NOT NULL,
  hour INTEGER, -- NULL for daily aggregates, 0-23 for hourly
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_read INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_converted INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  avg_response_time_ms NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(template_name, date, hour)
);

-- Table for real-time performance alerts
CREATE TABLE IF NOT EXISTS template_performance_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL, -- 'low_delivery', 'high_error', 'low_engagement'
  template_name TEXT,
  threshold_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS on new tables
ALTER TABLE template_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_performance_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin access
CREATE POLICY "System can manage A/B tests" ON template_ab_tests FOR ALL USING (true);
CREATE POLICY "System can manage performance metrics" ON template_performance_metrics FOR ALL USING (true);
CREATE POLICY "System can manage performance alerts" ON template_performance_alerts FOR ALL USING (true);

-- Function to aggregate template metrics daily
CREATE OR REPLACE FUNCTION aggregate_template_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Aggregate yesterday's data
  INSERT INTO template_performance_metrics (
    template_name, date, total_sent, total_delivered, total_read, 
    total_clicked, total_converted, total_errors, unique_users, avg_response_time_ms
  )
  SELECT 
    template_name,
    CURRENT_DATE - 1,
    COUNT(*) FILTER (WHERE event_type = 'sent'),
    COUNT(*) FILTER (WHERE event_type = 'delivered'),
    COUNT(*) FILTER (WHERE event_type = 'read'),
    COUNT(*) FILTER (WHERE event_type = 'clicked'),
    COUNT(*) FILTER (WHERE event_type = 'converted'),
    COUNT(*) FILTER (WHERE metadata ? 'error'),
    COUNT(DISTINCT wa_id),
    AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL)
  FROM template_sends 
  WHERE DATE(sent_at) = CURRENT_DATE - 1
  GROUP BY template_name
  ON CONFLICT (template_name, date, hour) 
  DO UPDATE SET
    total_sent = EXCLUDED.total_sent,
    total_delivered = EXCLUDED.total_delivered,
    total_read = EXCLUDED.total_read,
    total_clicked = EXCLUDED.total_clicked,
    total_converted = EXCLUDED.total_converted,
    total_errors = EXCLUDED.total_errors,
    unique_users = EXCLUDED.unique_users,
    avg_response_time_ms = EXCLUDED.avg_response_time_ms;
END;
$$;

-- Function to check and create performance alerts
CREATE OR REPLACE FUNCTION check_template_performance()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  template_record RECORD;
  error_rate NUMERIC;
  delivery_rate NUMERIC;
BEGIN
  -- Check error rates and delivery rates for each template in the last hour
  FOR template_record IN
    SELECT 
      template_name,
      COUNT(*) FILTER (WHERE event_type = 'sent') as sent_count,
      COUNT(*) FILTER (WHERE event_type = 'delivered') as delivered_count,
      COUNT(*) FILTER (WHERE metadata ? 'error') as error_count
    FROM template_sends 
    WHERE sent_at >= NOW() - INTERVAL '1 hour'
    GROUP BY template_name
    HAVING COUNT(*) FILTER (WHERE event_type = 'sent') > 10 -- Only check templates with significant volume
  LOOP
    -- Calculate rates
    error_rate := CASE WHEN template_record.sent_count > 0 THEN template_record.error_count::NUMERIC / template_record.sent_count ELSE 0 END;
    delivery_rate := CASE WHEN template_record.sent_count > 0 THEN template_record.delivered_count::NUMERIC / template_record.sent_count ELSE 0 END;
    
    -- Check for high error rate (>5%)
    IF error_rate > 0.05 THEN
      INSERT INTO template_performance_alerts (alert_type, template_name, threshold_value, current_value, severity)
      VALUES ('high_error', template_record.template_name, 0.05, error_rate, 'high')
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Check for low delivery rate (<90%)
    IF delivery_rate < 0.90 THEN
      INSERT INTO template_performance_alerts (alert_type, template_name, threshold_value, current_value, severity)
      VALUES ('low_delivery', template_record.template_name, 0.90, delivery_rate, 'medium')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_template_sends_performance ON template_sends(template_name, sent_at, event_type);
CREATE INDEX IF NOT EXISTS idx_template_sends_ab_test ON template_sends(ab_test_id, variant, event_type);
CREATE INDEX IF NOT EXISTS idx_template_performance_metrics_lookup ON template_performance_metrics(template_name, date DESC);
CREATE INDEX IF NOT EXISTS idx_template_alerts_active ON template_performance_alerts(status, triggered_at DESC) WHERE status = 'active';

-- Update trigger for template_ab_tests
CREATE OR REPLACE FUNCTION update_template_ab_tests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_template_ab_tests_updated_at
  BEFORE UPDATE ON template_ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_template_ab_tests_updated_at();