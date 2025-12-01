-- RAG Ingestion Pipeline: knowledge_web_pages + knowledge_chunks + pgvector
-- Migration: 20260201160000_rag_ingestion_pipeline.sql
-- Description: Full RAG pipeline for ingesting, chunking, embedding, and searching web content

-- ============================================================================
-- 1. Enable pgvector extension
-- ============================================================================

create extension if not exists vector;

-- ============================================================================
-- 2. knowledge_web_pages table
-- ============================================================================
-- Tracks ingested content from URLs (separate from registry)
-- Allows re-crawling, hash comparison, error tracking

create table if not exists knowledge_web_pages (
    id uuid primary key default gen_random_uuid(),
    source_id uuid not null references knowledge_web_sources(id) on delete cascade,
    url text not null,
    title text,
    status text not null default 'ACTIVE'
        check (status in ('ACTIVE', 'INACTIVE', 'ERROR')),
    http_status int,
    content_type text,                     -- 'text/html', 'application/pdf', etc.
    sha256_hash text,                      -- hash of raw content for change detection
    last_fetched_at timestamptz,
    fetch_error text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Indexes for knowledge_web_pages
create index if not exists idx_kwp_source
    on knowledge_web_pages (source_id);

create index if not exists idx_kwp_url
    on knowledge_web_pages (url);

create index if not exists idx_kwp_status
    on knowledge_web_pages (status);

create index if not exists idx_kwp_last_fetched
    on knowledge_web_pages (last_fetched_at);

-- ============================================================================
-- 3. knowledge_chunks table
-- ============================================================================
-- Each row = one chunk of text with embedding from a web page

create table if not exists knowledge_chunks (
    id bigserial primary key,
    source_id uuid not null references knowledge_web_sources(id) on delete cascade,
    page_id uuid not null references knowledge_web_pages(id) on delete cascade,
    chunk_index int not null,                 -- 0,1,2,... ordering within page
    content text not null,                    -- the text of the chunk
    tokens int,
    category text,                            -- copy from source.category
    jurisdiction_code text,                   -- copy from source.jurisdiction_code
    tags text[] default '{}',                 -- union of page/source tags
    embedding vector(1536),                   -- text-embedding-3-large dimension
    created_at timestamptz not null default now()
);

-- Unique constraint: one chunk_index per page
create unique index if not exists idx_knowledge_chunks_page_idx
    on knowledge_chunks (page_id, chunk_index);

-- Foreign key indexes
create index if not exists idx_knowledge_chunks_source
    on knowledge_chunks (source_id);

-- Category and jurisdiction filters
create index if not exists idx_knowledge_chunks_category
    on knowledge_chunks (category);

create index if not exists idx_knowledge_chunks_jurisdiction
    on knowledge_chunks (jurisdiction_code);

-- Vector similarity search index (IVFFlat with cosine distance)
-- Lists=100 is a good starting point for <1M vectors
create index if not exists idx_knowledge_chunks_embedding
    on knowledge_chunks using ivfflat (embedding vector_cosine_ops)
    with (lists = 100);

-- ============================================================================
-- 4. Seed initial pages from sources
-- ============================================================================
-- Create a knowledge_web_page row for each active source URL

insert into knowledge_web_pages (source_id, url)
select id as source_id, url
from knowledge_web_sources
where status = 'ACTIVE'
on conflict do nothing;

-- ============================================================================
-- 5. Helper function: DeepSearch for agents
-- ============================================================================
-- Example RPC function for semantic search with filters

create or replace function deep_search_knowledge(
    query_embedding vector(1536),
    p_category text default null,
    p_jurisdiction text default null,
    p_tags text[] default null,
    p_limit int default 20
)
returns table (
    chunk_id bigint,
    content text,
    category text,
    jurisdiction_code text,
    tags text[],
    source_name text,
    source_url text,
    page_url text,
    similarity float
) language sql stable as $$
    select
        kc.id as chunk_id,
        kc.content,
        kc.category,
        kc.jurisdiction_code,
        kc.tags,
        kws.name as source_name,
        kws.url as source_url,
        kwp.url as page_url,
        1 - (kc.embedding <=> query_embedding) as similarity
    from knowledge_chunks kc
    join knowledge_web_sources kws on kc.source_id = kws.id
    join knowledge_web_pages kwp on kc.page_id = kwp.id
    where
        kws.status = 'ACTIVE'
        and kwp.status = 'ACTIVE'
        and (p_category is null or kc.category = p_category)
        and (p_jurisdiction is null or kc.jurisdiction_code = p_jurisdiction)
        and (p_tags is null or kc.tags && p_tags)
    order by
        kc.embedding <=> query_embedding
    limit p_limit;
$$;

-- ============================================================================
-- 6. RLS Policies
-- ============================================================================

-- Enable RLS
alter table knowledge_web_pages enable row level security;
alter table knowledge_chunks enable row level security;

-- Service role can do everything
create policy "Service role full access to knowledge_web_pages"
    on knowledge_web_pages
    for all
    to service_role
    using (true)
    with check (true);

create policy "Service role full access to knowledge_chunks"
    on knowledge_chunks
    for all
    to service_role
    using (true)
    with check (true);

-- Authenticated users can read active pages and chunks
create policy "Authenticated users can read active pages"
    on knowledge_web_pages
    for select
    to authenticated
    using (status = 'ACTIVE');

create policy "Authenticated users can read chunks"
    on knowledge_chunks
    for select
    to authenticated
    using (true);

-- Anon users can read chunks (for public knowledge base queries)
create policy "Anon users can read chunks"
    on knowledge_chunks
    for select
    to anon
    using (true);

-- ============================================================================
-- 7. Comments for documentation
-- ============================================================================

comment on table knowledge_web_pages is
    'Tracks ingested web content from knowledge_web_sources. Each URL is fetched, hashed, and chunked.';

comment on column knowledge_web_pages.sha256_hash is
    'SHA-256 hash of raw content for change detection. Re-ingest only if hash changes.';

comment on table knowledge_chunks is
    'RAG vector store. Each row is a text chunk with embedding from a web page.';

comment on column knowledge_chunks.embedding is
    'Vector embedding (1536 dimensions) from text-embedding-3-large model.';

comment on function deep_search_knowledge is
    'Semantic search over knowledge chunks with category/jurisdiction filters. Returns top N most similar chunks.';
