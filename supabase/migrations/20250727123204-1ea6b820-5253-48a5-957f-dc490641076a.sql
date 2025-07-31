-- Fix WhatsApp integration: Enable pg_cron properly and create proper cron job
SELECT cron.schedule(
  'process-whatsapp-messages', 
  '* * * * *', 
  $$SELECT net.http_post(
    url := 'https://ijblirphkrrsnxazohwt.functions.supabase.co/process-incoming-messages',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqYmxpcnBoa3Jyc254YXpvaHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NDAzMzAsImV4cCI6MjA2ODIxNjMzMH0.gH-rvhmX1RvQSlgwbjqq15bHBgKmlDRkAGyfzFyEeKs"}'::jsonb
  )$$
) WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-whatsapp-messages'
);