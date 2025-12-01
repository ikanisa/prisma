-- Deep Search RPC: Vector similarity search for knowledge chunks
-- Filters by category, jurisdiction, and active status
-- Returns chunks with source and page metadata

create or replace function match_knowledge_chunks(
  query_embedding vector(1536),
  match_count int,
  filter_category text default null,
  filter_jurisdiction text default null
)
returns table (
  id bigint,
  source_id uuid,
  page_id uuid,
  chunk_index int,
  content text,
  category text,
  jurisdiction_code text,
  tags text[],
  similarity float4,
  source_name text,
  page_url text
)
language plpgsql
as $$
begin
  return query
  select
    kc.id,
    kc.source_id,
    kc.page_id,
    kc.chunk_index,
    kc.content,
    kc.category,
    kc.jurisdiction_code,
    kc.tags,
    1 - (kc.embedding <=> query_embedding) as similarity,
    kws.name as source_name,
    kwp.url as page_url
  from knowledge_chunks kc
  join knowledge_web_sources kws on kc.source_id = kws.id
  join knowledge_web_pages kwp   on kc.page_id = kwp.id
  where
    kws.status = 'ACTIVE'
    and kwp.status = 'ACTIVE'
    and (filter_category is null or kc.category = filter_category)
    and (
      filter_jurisdiction is null
      or kc.jurisdiction_code = filter_jurisdiction
      or kc.jurisdiction_code = 'GLOBAL'
    )
  order by kc.embedding <=> query_embedding
  limit match_count;
end;
$$;

comment on function match_knowledge_chunks is 'Vector similarity search for knowledge chunks with filtering by category and jurisdiction. Returns active chunks with source metadata.';

-- Grant execute to authenticated users
grant execute on function match_knowledge_chunks to authenticated;
grant execute on function match_knowledge_chunks to service_role;
