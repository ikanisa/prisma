-- Set up cron job to process incoming messages every minute
SELECT cron.schedule(
  'process-whatsapp-messages',
  '* * * * *', -- every minute
  $$
  SELECT
    net.http_post(
        url:='https://ijblirphkrrsnxazohwt.functions.supabase.co/functions/v1/process-incoming-messages',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqYmxpcnBoa3Jyc254YXpvaHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NDAzMzAsImV4cCI6MjA2ODIxNjMzMH0.gH-rvhmX1RvQSlgwbjqq15bHBgKmlDRkAGyfzFyEeKs"}'::jsonb,
        body:='{"timestamp": "' || now()::text || '"}'::jsonb
    ) as request_id;
  $$
);