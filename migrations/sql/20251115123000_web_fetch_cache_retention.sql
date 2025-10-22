-- Enhance web fetch cache observability and retention hygiene.
ALTER TABLE public.web_fetch_cache
    ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ DEFAULT now();

UPDATE public.web_fetch_cache
SET last_used_at = CASE
        WHEN jsonb_typeof(metadata -> 'lastUsedAt') = 'string' THEN (metadata ->> 'lastUsedAt')::timestamptz
        ELSE fetched_at
    END
WHERE last_used_at IS NULL;

ALTER TABLE public.web_fetch_cache
    ALTER COLUMN last_used_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS web_fetch_cache_last_used_at_idx
    ON public.web_fetch_cache (last_used_at DESC);

CREATE OR REPLACE VIEW public.web_fetch_cache_metrics
WITH (security_invoker = true) AS
SELECT
    count(*)::bigint AS total_rows,
    COALESCE(sum(octet_length(content)), 0)::bigint AS total_bytes,
    COALESCE(sum(length(content)), 0)::bigint AS total_chars,
    min(fetched_at) AS oldest_fetched_at,
    max(fetched_at) AS newest_fetched_at,
    min(last_used_at) AS oldest_last_used_at,
    max(last_used_at) AS newest_last_used_at,
    count(*) FILTER (WHERE fetched_at >= now() - INTERVAL '1 day')::bigint AS fetched_last_24h,
    count(*) FILTER (WHERE last_used_at >= now() - INTERVAL '1 day')::bigint AS used_last_24h
FROM public.web_fetch_cache;

COMMENT ON VIEW public.web_fetch_cache_metrics IS
    'Aggregated freshness and size metrics for the web fetch cache table.';
