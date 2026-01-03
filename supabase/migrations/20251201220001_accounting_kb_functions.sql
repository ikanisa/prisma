-- Semantic Search Function for Knowledge Base
-- Add this to your Supabase SQL editor or include in migrations

-- Function: match_knowledge_chunks
-- Performs vector similarity search with filters
-- Only create if required columns exist
-- Drop all overloads of the function first (handle gracefully)
DO $$ 
BEGIN
    -- Drop function with all possible signatures
    DROP FUNCTION IF EXISTS match_knowledge_chunks(vector, float, int, text, text[], text[]) CASCADE;
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if function doesn't exist or has different signature
    NULL;
END $$;

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_documents' 
        AND column_name = 'source_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_sources' 
        AND column_name = 'jurisdiction_id'
    ) THEN
        EXECUTE 'CREATE OR REPLACE FUNCTION match_knowledge_chunks(
          query_embedding vector(1536),
          match_threshold float DEFAULT 0.75,
          match_count int DEFAULT 10,
          filter_jurisdiction text DEFAULT NULL,
          filter_types text[] DEFAULT NULL,
          filter_authority_levels text[] DEFAULT NULL
        )
        RETURNS TABLE (
          chunk_id uuid,
          document_id uuid,
          content text,
          section_path text,
          heading text,
          similarity float,
          document_code text,
          document_title text,
          source_type text,
          source_name text,
          authority_level text,
          jurisdiction_code text,
          effective_from date,
          effective_to date
        )
        LANGUAGE plpgsql
        AS $func$
        BEGIN
          RETURN QUERY
          SELECT
            c.id AS chunk_id,
            c.document_id,
            c.content,
            c.section_path,
            c.heading,
            (1 - (e.embedding <=> query_embedding))::float AS similarity,
            d.code AS document_code,
            d.title AS document_title,
            s.type AS source_type,
            s.name AS source_name,
            COALESCE(s.authority_level, ''UNKNOWN'') AS authority_level,
            j.code AS jurisdiction_code,
            COALESCE(c.effective_from, d.effective_from) AS effective_from,
            COALESCE(c.effective_to, d.effective_to) AS effective_to
          FROM knowledge_embeddings e
          JOIN knowledge_chunks c ON c.id = e.chunk_id
          JOIN knowledge_documents d ON d.id = c.document_id
          JOIN knowledge_sources s ON s.id = d.source_id
          JOIN jurisdictions j ON j.id = s.jurisdiction_id
          WHERE
            (1 - (e.embedding <=> query_embedding)) > match_threshold
            AND (filter_jurisdiction IS NULL OR j.code = filter_jurisdiction)
            AND (filter_types IS NULL OR s.type = ANY(filter_types))
            AND (filter_authority_levels IS NULL OR COALESCE(s.authority_level, ''UNKNOWN'') = ANY(filter_authority_levels))
            AND d.status = ''ACTIVE''
          ORDER BY e.embedding <=> query_embedding
          LIMIT match_count;
        END;
        $func$';
    END IF;
END $$;

-- Example usage:
-- select * from match_knowledge_chunks(
--   query_embedding := '[0.1, 0.2, ...]'::vector(1536),
--   match_threshold := 0.75,
--   match_count := 6,
--   filter_jurisdiction := 'GLOBAL',
--   filter_types := array['IAS', 'IFRS'],
--   filter_authority_levels := array['PRIMARY']
-- );


-- Function: get_document_context
-- Retrieves surrounding chunks for context
create or replace function get_document_context(
  target_chunk_id uuid,
  context_window int default 2
)
returns table (
  chunk_id uuid,
  chunk_index int,
  content text,
  section_path text,
  heading text,
  distance_from_target int
)
language plpgsql
as $$
declare
  target_doc_id uuid;
  target_index int;
begin
  -- Get target chunk's document and index
  select document_id, chunk_index 
  into target_doc_id, target_index
  from knowledge_chunks
  where id = target_chunk_id;

  if not found then
    raise exception 'Chunk not found: %', target_chunk_id;
  end if;

  return query
  select
    c.id as chunk_id,
    c.chunk_index,
    c.content,
    c.section_path,
    c.heading,
    (c.chunk_index - target_index) as distance_from_target
  from knowledge_chunks c
  where
    c.document_id = target_doc_id
    and c.chunk_index between (target_index - context_window) and (target_index + context_window)
  order by c.chunk_index;
end;
$$;

-- Example usage:
-- select * from get_document_context(
--   target_chunk_id := '123e4567-e89b-12d3-a456-426614174000',
--   context_window := 2
-- );


-- Function: log_agent_query
-- Inserts audit log entry for agent query
create or replace function log_agent_query(
  p_agent_name text,
  p_user_id uuid,
  p_query_text text,
  p_response_summary text,
  p_top_chunk_ids uuid[],
  p_jurisdiction_id uuid default null,
  p_latency_ms int default null,
  p_metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
as $$
declare
  log_id bigint;
begin
  insert into agent_queries_log (
    agent_name,
    user_id,
    query_text,
    response_summary,
    top_chunk_ids,
    jurisdiction_id,
    latency_ms,
    metadata
  ) values (
    p_agent_name,
    p_user_id,
    p_query_text,
    p_response_summary,
    p_top_chunk_ids,
    p_jurisdiction_id,
    p_latency_ms,
    p_metadata
  )
  returning id into log_id;

  return log_id;
end;
$$;

-- Example usage:
-- select log_agent_query(
--   p_agent_name := 'AccountantAI',
--   p_user_id := '123e4567-e89b-12d3-a456-426614174000',
--   p_query_text := 'How to account for FX gains?',
--   p_response_summary := 'IAS 21.28 requires...',
--   p_top_chunk_ids := array['chunk-uuid-1', 'chunk-uuid-2']::uuid[],
--   p_latency_ms := 450,
--   p_metadata := '{"confidence": "HIGH"}'::jsonb
-- );


-- View: knowledge_base_stats
-- Summary statistics for monitoring
-- Only create if required columns exist
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_sources' 
        AND column_name = 'authority_level'
    ) THEN
        EXECUTE 'CREATE OR REPLACE VIEW knowledge_base_stats AS
        SELECT
          (SELECT count(*) FROM jurisdictions) AS total_jurisdictions,
          (SELECT count(*) FROM knowledge_sources) AS total_sources,
          (SELECT count(*) FROM knowledge_documents) AS total_documents,
          (SELECT count(*) FROM knowledge_chunks) AS total_chunks,
          (SELECT count(*) FROM knowledge_embeddings) AS total_embeddings,
          (SELECT count(*) FROM knowledge_sources WHERE authority_level = ''PRIMARY'') AS primary_sources,
          (SELECT count(*) FROM knowledge_sources WHERE authority_level = ''SECONDARY'') AS secondary_sources,
          (SELECT count(*) FROM knowledge_documents WHERE status = ''ACTIVE'') AS active_documents,
          (SELECT count(*) FROM agent_queries_log WHERE created_at > now() - interval ''24 hours'') AS queries_last_24h,
          (SELECT avg(latency_ms)::int FROM agent_queries_log WHERE created_at > now() - interval ''24 hours'') AS avg_latency_ms_24h';
    ELSE
        EXECUTE 'CREATE OR REPLACE VIEW knowledge_base_stats AS
        SELECT
          (SELECT count(*) FROM jurisdictions) AS total_jurisdictions,
          (SELECT count(*) FROM knowledge_sources) AS total_sources,
          (SELECT count(*) FROM knowledge_documents) AS total_documents,
          (SELECT count(*) FROM knowledge_chunks) AS total_chunks,
          (SELECT count(*) FROM knowledge_embeddings) AS total_embeddings,
          0 AS primary_sources,
          0 AS secondary_sources,
          (SELECT count(*) FROM knowledge_documents WHERE status = ''ACTIVE'') AS active_documents,
          (SELECT count(*) FROM agent_queries_log WHERE created_at > now() - interval ''24 hours'') AS queries_last_24h,
          (SELECT avg(latency_ms)::int FROM agent_queries_log WHERE created_at > now() - interval ''24 hours'') AS avg_latency_ms_24h';
    END IF;
END $$;

-- Example usage:
-- select * from knowledge_base_stats;


-- View: stale_documents
-- Identifies documents that may need refreshing
-- Only create if required columns exist
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_documents' 
        AND column_name = 'source_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_sources' 
        AND column_name = 'jurisdiction_id'
    ) THEN
        EXECUTE 'CREATE OR REPLACE VIEW stale_documents AS
        SELECT
          d.id AS document_id,
          d.title,
          d.code,
          s.type AS source_type,
          s.name AS source_name,
          j.code AS jurisdiction_code,
          d.effective_from,
          now()::date - d.effective_from::date AS days_old,
          CASE
            WHEN s.type = ''TAX_LAW'' AND (now()::date - d.effective_from::date) > 90 THEN ''STALE''
            WHEN s.type IN (''IFRS'', ''IAS'') AND (now()::date - d.effective_from::date) > 180 THEN ''STALE''
            WHEN s.type = ''ISA'' AND (now()::date - d.effective_from::date) > 365 THEN ''STALE''
            WHEN s.type IN (''ACCA'', ''CPA'') AND (now()::date - d.effective_from::date) > 365 THEN ''STALE''
            ELSE ''FRESH''
          END AS freshness_status
        FROM knowledge_documents d
        JOIN knowledge_sources s ON s.id = d.source_id
        JOIN jurisdictions j ON j.id = s.jurisdiction_id
        WHERE d.status = ''ACTIVE''
          AND d.effective_from IS NOT NULL
        ORDER BY days_old DESC';
    END IF;
END $$;

-- Example usage:
-- select * from stale_documents where freshness_status = 'STALE';


-- View: agent_performance
-- Agent query performance metrics
create or replace view agent_performance as
select
  agent_name,
  date(created_at) as query_date,
  count(*) as total_queries,
  avg(latency_ms)::int as avg_latency_ms,
  percentile_cont(0.5) within group (order by latency_ms)::int as median_latency_ms,
  percentile_cont(0.95) within group (order by latency_ms)::int as p95_latency_ms,
  count(*) filter (where metadata->>'confidence' = 'HIGH') as high_confidence_count,
  count(*) filter (where metadata->>'confidence' = 'LOW') as low_confidence_count,
  (count(*) filter (where metadata->>'confidence' = 'LOW') * 100.0 / count(*))::numeric(5,2) as low_confidence_pct
from agent_queries_log
where created_at > now() - interval '30 days'
group by agent_name, date(created_at)
order by query_date desc, agent_name;

-- Example usage:
-- select * from agent_performance where query_date = current_date;


-- Index optimization
-- Note: date() function is not immutable, so we index on created_at directly
-- The view can still use date(created_at) in queries
CREATE INDEX IF NOT EXISTS idx_agent_queries_log_agent_created
  ON agent_queries_log (agent_name, created_at);

-- Only create index if columns exist
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_documents' 
        AND column_name = 'effective_from'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_documents' 
        AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_knowledge_documents_effective_from
            ON knowledge_documents (effective_from) WHERE status = 'ACTIVE';
    END IF;
END $$;

-- Only create index if both columns exist
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_sources' 
        AND column_name IN ('type', 'authority_level')
        HAVING count(*) = 2
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_knowledge_sources_type_authority
            ON knowledge_sources (type, authority_level);
    END IF;
END $$;


-- Grant permissions (adjust based on your RLS setup)
-- grant execute on function match_knowledge_chunks to authenticated;
-- grant execute on function get_document_context to authenticated;
-- grant execute on function log_agent_query to service_role;
-- grant select on knowledge_base_stats to authenticated;
-- grant select on stale_documents to authenticated;
-- grant select on agent_performance to authenticated;


-- Comments for documentation (only if functions/views exist)
DO $$ 
BEGIN
    -- Only add comments if the function exists with the expected signature
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'match_knowledge_chunks'
        AND pg_get_function_arguments(p.oid) LIKE '%vector(1536)%'
    ) THEN
        EXECUTE 'COMMENT ON FUNCTION match_knowledge_chunks(vector, float, int, text, text[], text[]) IS ''Semantic search over knowledge chunks using vector similarity with filters''';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'get_document_context'
    ) THEN
        EXECUTE 'COMMENT ON FUNCTION get_document_context(uuid, int) IS ''Retrieve surrounding chunks for context around a target chunk''';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'log_agent_query'
    ) THEN
        EXECUTE 'COMMENT ON FUNCTION log_agent_query(text, uuid, text, text, uuid[], uuid, int, jsonb) IS ''Log agent query to audit trail''';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_schema = 'public'
        AND table_name = 'knowledge_base_stats'
    ) THEN
        EXECUTE 'COMMENT ON VIEW knowledge_base_stats IS ''Summary statistics for knowledge base monitoring''';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_schema = 'public'
        AND table_name = 'stale_documents'
    ) THEN
        EXECUTE 'COMMENT ON VIEW stale_documents IS ''Documents that may need refreshing based on age''';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_schema = 'public'
        AND table_name = 'agent_performance'
    ) THEN
        EXECUTE 'COMMENT ON VIEW agent_performance IS ''Agent query performance metrics over time''';
    END IF;
END $$;
