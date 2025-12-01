-- Helper functions for accounting knowledge base queries

-- Match knowledge chunks using semantic search
-- Returns top N most similar chunks based on cosine similarity
create or replace function match_knowledge_chunks(
  query_embedding vector(1536),
  match_count int default 10,
  filter jsonb default '{}'::jsonb
)
returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  section_path text,
  heading text,
  similarity float,
  document_title text,
  document_code text,
  source_name text,
  source_type text,
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
    kc.id as chunk_id,
    kc.document_id,
    kc.content,
    kc.section_path,
    kc.heading,
    1 - (ke.embedding <=> query_embedding) as similarity,
    kd.title as document_title,
    kd.code as document_code,
    ks.name as source_name,
    ks.type as source_type,
    ks.authority_level,
    j.code as jurisdiction_code,
    kd.effective_from,
    kd.effective_to
  from knowledge_embeddings ke
  join knowledge_chunks kc on ke.chunk_id = kc.id
  join knowledge_documents kd on kc.document_id = kd.id
  join knowledge_sources ks on kd.source_id = ks.id
  left join jurisdictions j on ks.jurisdiction_id = j.id
  where
    kd.status = 'ACTIVE'
    and (
      filter->>'jurisdiction_code' is null
      or j.code = filter->>'jurisdiction_code'
    )
    and (
      filter->'types' is null
      or ks.type = any(array(select jsonb_array_elements_text(filter->'types')))
    )
    and (
      filter->'authority_levels' is null
      or ks.authority_level = any(array(select jsonb_array_elements_text(filter->'authority_levels')))
    )
  order by ke.embedding <=> query_embedding
  limit match_count;
end;
$$;

comment on function match_knowledge_chunks is 
  'Semantic search over knowledge chunks using vector similarity (cosine distance)';

-- Keyword search fallback
create or replace function search_knowledge_chunks_keyword(
  search_query text,
  match_count int default 10,
  filter jsonb default '{}'::jsonb
)
returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  section_path text,
  heading text,
  document_title text,
  document_code text,
  source_name text,
  source_type text,
  authority_level text,
  jurisdiction_code text
)
language plpgsql
as $$
begin
  return query
  select
    kc.id as chunk_id,
    kc.document_id,
    kc.content,
    kc.section_path,
    kc.heading,
    kd.title as document_title,
    kd.code as document_code,
    ks.name as source_name,
    ks.type as source_type,
    ks.authority_level,
    j.code as jurisdiction_code
  from knowledge_chunks kc
  join knowledge_documents kd on kc.document_id = kd.id
  join knowledge_sources ks on kd.source_id = ks.id
  left join jurisdictions j on ks.jurisdiction_id = j.id
  where
    kd.status = 'ACTIVE'
    and (
      kc.content ilike '%' || search_query || '%'
      or kc.heading ilike '%' || search_query || '%'
      or kc.section_path ilike '%' || search_query || '%'
      or kd.title ilike '%' || search_query || '%'
      or kd.code ilike '%' || search_query || '%'
    )
    and (
      filter->>'jurisdiction_code' is null
      or j.code = filter->>'jurisdiction_code'
    )
    and (
      filter->'types' is null
      or ks.type = any(array(select jsonb_array_elements_text(filter->'types')))
    )
  order by
    -- Boost exact matches in code or section_path
    case when kd.code ilike search_query then 0
         when kc.section_path ilike '%' || search_query || '%' then 1
         when kd.title ilike '%' || search_query || '%' then 2
         else 3
    end,
    kc.chunk_index
  limit match_count;
end;
$$;

comment on function search_knowledge_chunks_keyword is 
  'Keyword-based fallback search when semantic search yields poor results';

-- Get context chunks around a specific chunk (for continuity)
create or replace function get_context_chunks(
  target_chunk_id uuid,
  before_count int default 1,
  after_count int default 1
)
returns table (
  chunk_id uuid,
  chunk_index int,
  content text,
  section_path text,
  heading text
)
language plpgsql
as $$
declare
  target_doc_id uuid;
  target_index int;
begin
  -- Get document and index of target chunk
  select document_id, chunk_index
  into target_doc_id, target_index
  from knowledge_chunks
  where id = target_chunk_id;

  return query
  select
    id as chunk_id,
    chunk_index,
    content,
    section_path,
    heading
  from knowledge_chunks
  where
    document_id = target_doc_id
    and chunk_index between (target_index - before_count) and (target_index + after_count)
  order by chunk_index;
end;
$$;

comment on function get_context_chunks is 
  'Retrieve surrounding chunks for context continuity';

-- Log agent query for audit trail
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
  new_id bigint;
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
  returning id into new_id;

  return new_id;
end;
$$;

comment on function log_agent_query is 
  'Log agent knowledge retrieval query for audit and analysis';

-- Get ingestion job stats
create or replace function get_ingestion_stats(
  job_id_param uuid default null
)
returns table (
  job_id uuid,
  source_name text,
  status text,
  files_count bigint,
  chunks_count bigint,
  embeddings_count bigint,
  started_at timestamptz,
  finished_at timestamptz,
  duration_seconds int
)
language plpgsql
as $$
begin
  return query
  select
    ij.id as job_id,
    ks.name as source_name,
    ij.status,
    count(distinct if_table.id) as files_count,
    count(distinct kc.id) as chunks_count,
    count(distinct ke.id) as embeddings_count,
    ij.started_at,
    ij.finished_at,
    extract(epoch from (ij.finished_at - ij.started_at))::int as duration_seconds
  from ingestion_jobs ij
  left join knowledge_sources ks on ij.source_id = ks.id
  left join ingestion_files if_table on if_table.job_id = ij.id
  left join knowledge_documents kd on kd.source_id = ks.id
  left join knowledge_chunks kc on kc.document_id = kd.id
  left join knowledge_embeddings ke on ke.chunk_id = kc.id
  where
    job_id_param is null or ij.id = job_id_param
  group by ij.id, ks.name, ij.status, ij.started_at, ij.finished_at;
end;
$$;

comment on function get_ingestion_stats is 
  'Get statistics for ingestion jobs (files, chunks, embeddings processed)';
