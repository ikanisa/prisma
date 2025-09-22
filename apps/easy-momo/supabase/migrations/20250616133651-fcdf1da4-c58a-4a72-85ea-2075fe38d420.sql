
-- Drop the existing view
DROP VIEW IF EXISTS public.transaction_analytics;

-- Recreate the view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.transaction_analytics
WITH (security_invoker = on) AS
SELECT 
  country,
  provider,
  ussd_pattern_type,
  COUNT(*) as total_scans,
  COUNT(CASE WHEN launched_ussd = true THEN 1 END) as successful_launches,
  ROUND(
    (COUNT(CASE WHEN launched_ussd = true THEN 1 END)::decimal / COUNT(*)) * 100, 
    2
  ) as success_rate_percent,
  AVG(confidence_score) as avg_confidence
FROM public.transactions
WHERE country IS NOT NULL
GROUP BY country, provider, ussd_pattern_type
ORDER BY total_scans DESC;
