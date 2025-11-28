-- Phase 3 data source enhancements: cache fetched web content for reuse.
CREATE TABLE IF NOT EXISTS public.web_fetch_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT UNIQUE NOT NULL,
    content TEXT,
    content_hash TEXT,
    status TEXT,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb,
    inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS web_fetch_cache_fetched_at_idx ON public.web_fetch_cache (fetched_at DESC);
CREATE INDEX IF NOT EXISTS web_fetch_cache_last_used_at_idx ON public.web_fetch_cache (last_used_at DESC);

ALTER TABLE public.web_fetch_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'web_fetch_cache'
          AND policyname = 'Service role web fetch cache'
    ) THEN
        EXECUTE 'CREATE POLICY "Service role web fetch cache" ON public.web_fetch_cache
            FOR ALL
            USING (auth.role() = ''service_role'')
            WITH CHECK (auth.role() = ''service_role'');';
    END IF;
END
$$;

CREATE TRIGGER set_web_fetch_cache_updated_at
    BEFORE UPDATE ON public.web_fetch_cache
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

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
