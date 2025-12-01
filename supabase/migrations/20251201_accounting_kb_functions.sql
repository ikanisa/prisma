-- Semantic Search Function for Knowledge Base
-- Add this to your Supabase SQL editor or include in migrations

-- Function: match_knowledge_chunks
-- Performs vector similarity search with filters
create or replace function match_knowledge_chunks(
  query_embedding vector(1536),
  match_threshold float default 0.75,
  match_count int default 10,
  filter_jurisdiction text default null,
  filter_types text[] default null,
  filter_authority_levels text[] default null
)
returns table (
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
language plpgsql
as $$
begin
  return query
  select
    c.id as chunk_id,
    c.document_id,
    c.content,
    c.section_path,
    c.heading,
    (1 - (e.embedding <=> query_embedding))::float as similarity,
    d.code as document_code,
    d.title as document_title,
    s.type as source_type,
    s.name as source_name,
    s.authority_level,
    j.code as jurisdiction_code,
    coalesce(c.effective_from, d.effective_from) as effective_from,
    coalesce(c.effective_to, d.effective_to) as effective_to
  from knowledge_embeddings e
  join knowledge_chunks c on c.id = e.chunk_id
  join knowledge_documents d on d.id = c.document_id
  join knowledge_sources s on s.id = d.source_id
  join jurisdictions j on j.id = s.jurisdiction_id
  where
    (1 - (e.embedding <=> query_embedding)) > match_threshold
    and (filter_jurisdiction is null or j.code = filter_jurisdiction)
    and (filter_types is null or s.type = any(filter_types))
    and (filter_authority_levels is null or s.authority_level = any(filter_authority_levels))
    and d.status = 'ACTIVE'
  order by e.embedding <=> query_embedding
  limit match_count;
end;
$$;

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
create or replace view knowledge_base_stats as
select
  (select count(*) from jurisdictions) as total_jurisdictions,
  (select count(*) from knowledge_sources) as total_sources,
  (select count(*) from knowledge_documents) as total_documents,
  (select count(*) from knowledge_chunks) as total_chunks,
  (select count(*) from knowledge_embeddings) as total_embeddings,
  (select count(*) from knowledge_sources where authority_level = 'PRIMARY') as primary_sources,
  (select count(*) from knowledge_sources where authority_level = 'SECONDARY') as secondary_sources,
  (select count(*) from knowledge_documents where status = 'ACTIVE') as active_documents,
  (select count(*) from agent_queries_log where created_at > now() - interval '24 hours') as queries_last_24h,
  (select avg(latency_ms)::int from agent_queries_log where created_at > now() - interval '24 hours') as avg_latency_ms_24h;

-- Example usage:
-- select * from knowledge_base_stats;


-- View: stale_documents
-- Identifies documents that may need refreshing
create or replace view stale_documents as
select
  d.id as document_id,
  d.title,
  d.code,
  s.type as source_type,
  s.name as source_name,
  j.code as jurisdiction_code,
  d.effective_from,
  now()::date - d.effective_from::date as days_old,
  case
    when s.type = 'TAX_LAW' and (now()::date - d.effective_from::date) > 90 then 'STALE'
    when s.type in ('IFRS', 'IAS') and (now()::date - d.effective_from::date) > 180 then 'STALE'
    when s.type = 'ISA' and (now()::date - d.effective_from::date) > 365 then 'STALE'
    when s.type in ('ACCA', 'CPA') and (now()::date - d.effective_from::date) > 365 then 'STALE'
    else 'FRESH'
  end as freshness_status
from knowledge_documents d
join knowledge_sources s on s.id = d.source_id
join jurisdictions j on j.id = s.jurisdiction_id
where d.status = 'ACTIVE'
  and d.effective_from is not null
order by days_old desc;

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
create index if not exists idx_agent_queries_log_agent_date
  on agent_queries_log (agent_name, date(created_at));

create index if not exists idx_knowledge_documents_effective_from
  on knowledge_documents (effective_from) where status = 'ACTIVE';

create index if not exists idx_knowledge_sources_type_authority
  on knowledge_sources (type, authority_level);


-- Grant permissions (adjust based on your RLS setup)
-- grant execute on function match_knowledge_chunks to authenticated;
-- grant execute on function get_document_context to authenticated;
-- grant execute on function log_agent_query to service_role;
-- grant select on knowledge_base_stats to authenticated;
-- grant select on stale_documents to authenticated;
-- grant select on agent_performance to authenticated;


-- Comments for documentation
comment on function match_knowledge_chunks is 'Semantic search over knowledge chunks using vector similarity with filters';
comment on function get_document_context is 'Retrieve surrounding chunks for context around a target chunk';
comment on function log_agent_query is 'Log agent query to audit trail';
comment on view knowledge_base_stats is 'Summary statistics for knowledge base monitoring';
comment on view stale_documents is 'Documents that may need refreshing based on age';
comment on view agent_performance is 'Agent query performance metrics over time';
