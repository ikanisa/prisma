-- Phase 3 data source enhancements: cache fetched web content for reuse.
CREATE TABLE IF NOT EXISTS public.web_fetch_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT UNIQUE NOT NULL,
    content TEXT,
    content_hash TEXT,
    status TEXT,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb,
    inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS web_fetch_cache_fetched_at_idx ON public.web_fetch_cache (fetched_at DESC);

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
