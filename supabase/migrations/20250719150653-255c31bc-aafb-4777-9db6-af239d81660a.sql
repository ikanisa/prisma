-- Set up cron job for hardware price refresh (every Monday at 6 AM)
SELECT cron.schedule(
    'hardware-price-refresh-weekly',
    '0 6 * * 1',
    $$
    SELECT net.http_post(
        url := 'https://ijblirphkrrsnxazohwt.supabase.co/functions/v1/hardware-price-refresh',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqYmxpcnBoa3Jyc254YXpvaHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NDAzMzAsImV4cCI6MjA2ODIxNjMzMH0.gH-rvhmX1RvQSlgwbjqq15bHBgKmlDRkAGyfzFyEeKs"}'::jsonb,
        body := '{"trigger": "cron"}'::jsonb
    );
    $$
);

-- Create QA test scenarios table
CREATE TABLE IF NOT EXISTS qa_test_scenarios (
  id text PRIMARY KEY,
  scenario_name text NOT NULL,
  description text,
  test_steps text[],
  expected_result text,
  priority text CHECK (priority IN ('low','medium','high')),
  pilot_location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on QA table
ALTER TABLE qa_test_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage QA scenarios" 
ON qa_test_scenarios FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());