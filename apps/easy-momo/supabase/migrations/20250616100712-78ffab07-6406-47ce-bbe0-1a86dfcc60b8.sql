
-- Add country/provider detection fields to transactions table
ALTER TABLE public.transactions 
ADD COLUMN country text,
ADD COLUMN provider text,
ADD COLUMN ussd_pattern_type text,
ADD COLUMN confidence_score decimal(3,2);

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_transactions_country_provider ON public.transactions(country, provider);
CREATE INDEX IF NOT EXISTS idx_transactions_pattern_type ON public.transactions(ussd_pattern_type);

-- Create analytics view for success rates by country/provider
CREATE OR REPLACE VIEW transaction_analytics AS
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

-- Function to get success rate statistics
CREATE OR REPLACE FUNCTION get_ussd_success_stats(
  p_country text DEFAULT NULL,
  p_provider text DEFAULT NULL
)
RETURNS TABLE (
  country text,
  provider text,
  pattern_type text,
  total_scans bigint,
  successful_launches bigint,
  success_rate numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    t.country,
    t.provider,
    t.ussd_pattern_type,
    COUNT(*) as total_scans,
    COUNT(CASE WHEN t.launched_ussd = true THEN 1 END) as successful_launches,
    ROUND(
      (COUNT(CASE WHEN t.launched_ussd = true THEN 1 END)::decimal / COUNT(*)) * 100, 
      2
    ) as success_rate
  FROM public.transactions t
  WHERE (p_country IS NULL OR t.country = p_country)
    AND (p_provider IS NULL OR t.provider = p_provider)
    AND t.country IS NOT NULL
  GROUP BY t.country, t.provider, t.ussd_pattern_type
  ORDER BY COUNT(*) DESC;
$$;
