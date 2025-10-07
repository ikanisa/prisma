-- Phase 5 – Knowledge retrieval enhancements
ALTER TABLE IF EXISTS public.chunks
    ADD COLUMN IF NOT EXISTS index_name text NOT NULL DEFAULT 'finance_docs_v1';
ALTER TABLE IF EXISTS public.chunks
    ADD COLUMN IF NOT EXISTS chunk_index int NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS public.chunks
    ADD COLUMN IF NOT EXISTS embed_model text;
ALTER TABLE IF EXISTS public.chunks
    ADD COLUMN IF NOT EXISTS content_hash text;
UPDATE public.chunks
SET content_hash = md5(content)
WHERE content_hash IS NULL;
ALTER TABLE IF EXISTS public.chunks
    ALTER COLUMN content_hash SET NOT NULL;
ALTER TABLE IF EXISTS public.chunks
    DROP CONSTRAINT IF EXISTS chunks_org_id_content_hash_key;
ALTER TABLE IF EXISTS public.chunks
    ADD CONSTRAINT chunks_org_index_content_hash_key UNIQUE (org_id, index_name, content_hash);
CREATE INDEX IF NOT EXISTS chunks_index_name_idx ON public.chunks(index_name);
CREATE INDEX IF NOT EXISTS chunks_org_index_idx ON public.chunks(org_id, index_name);
