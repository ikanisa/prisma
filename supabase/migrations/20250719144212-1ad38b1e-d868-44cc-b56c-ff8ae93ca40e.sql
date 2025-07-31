-- Set up cron job for automatic POS sync every 30 seconds
SELECT cron.schedule(
  'pos-sync-all-bars',
  '*/30 * * * * *', -- every 30 seconds
  $$
  SELECT net.http_post(
    url := 'https://ijblirphkrrsnxazohwt.supabase.co/functions/v1/pos-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqYmxpcnBoa3Jyc254YXpvaHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NDAzMzAsImV4cCI6MjA2ODIxNjMzMH0.gH-rvhmX1RvQSlgwbjqq15bHBgKmlDRkAGyfzFyEeKs"}'::jsonb,
    body := '{"action": "sync_all_bars"}'::jsonb
  ) as request_id;
  $$
);