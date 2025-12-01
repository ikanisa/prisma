-- Accounting Knowledge Base - Comprehensive Schema
-- Migration: 20251201180000
-- Description: Complete schema for IFRS, IAS, ISA, GAAP, Tax Laws, ACCA, CPA knowledge base with RAG support

-- 1) Enable pgvector (if not already enabled)
create extension if not exists vector;

-- 2) Jurisdictions
create table if not exists jurisdictions (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,         -- e.g. "RW", "EU", "US", "MT", "GLOBAL"
    name text not null,                -- e.g. "Rwanda", "European Union", "Malta"
    region text,                       -- e.g. "Africa", "Europe"
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
);

comment on table jurisdictions is 'Jurisdictions for accounting standards and tax laws';
comment on column jurisdictions.code is 'ISO code or custom identifier (RW, MT, EU, US, GLOBAL)';
comment on column jurisdictions.metadata is 'Additional jurisdiction metadata (currency, language, etc.)';

-- 3) Knowledge sources (IFRS, IAS, ISA, Tax laws, ACCA, etc.)
create table if not exists knowledge_sources (
    id uuid primary key default gen_random_uuid(),
    name text not null,                         -- e.g. "IFRS Foundation", "RRA", "ACCA"
    type text not null check (
        type in (
            'IFRS', 'IAS', 'ISA', 'ISSAI', 'IESBA',
            'GAAP', 'US_GAAP', 'TAX_LAW', 
            'ACCA', 'CPA', 'OECD', 'INTERNAL', 'OTHER'
        )
    ),
    jurisdiction_id uuid references jurisdictions(id),
    authority_level text not null default 'SECONDARY' check (
        authority_level in ('PRIMARY', 'SECONDARY', 'INTERNAL')
    ),
    url text,
    description text,
    version text,                               -- e.g. "2023", "Rev. 2"
    effective_from date,
    effective_to date,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table knowledge_sources is 'Authoritative sources of accounting/tax knowledge';
comment on column knowledge_sources.type is 'Type of standard or regulation';
comment on column knowledge_sources.authority_level is 'PRIMARY (law/standard), SECONDARY (commentary), INTERNAL (firm guidance)';

create index if not exists idx_knowledge_sources_jurisdiction
    on knowledge_sources (jurisdiction_id);

create index if not exists idx_knowledge_sources_type
    on knowledge_sources (type);

create index if not exists idx_knowledge_sources_authority
    on knowledge_sources (authority_level);

-- 4) Knowledge documents (single standard/law/guide)
create table if not exists knowledge_documents (
    id uuid primary key default gen_random_uuid(),
    source_id uuid not null references knowledge_sources(id) on delete cascade,
    title text not null,                        -- e.g. "IAS 21: The Effects of Changes in Foreign Exchange Rates"
    code text,                                  -- e.g. "IAS 21", "IFRS 15", "RW-VAT-2022"
    language_code text default 'en',           -- e.g. "en", "fr", "rw"
    status text not null default 'ACTIVE' check (
        status in ('ACTIVE', 'DEPRECATED', 'DRAFT', 'SUPERSEDED')
    ),
    version text,
    effective_from date,
    effective_to date,
    summary text,                              -- Brief summary of the document
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table knowledge_documents is 'Individual standards, laws, or guidance documents';
comment on column knowledge_documents.code is 'Standard code for easy reference (IAS 21, IFRS 9, etc.)';
comment on column knowledge_documents.status is 'Current status of the document';

create index if not exists idx_knowledge_documents_source
    on knowledge_documents (source_id);

create index if not exists idx_knowledge_documents_code
    on knowledge_documents (code) where code is not null;

create index if not exists idx_knowledge_documents_status
    on knowledge_documents (status);

-- 5) Knowledge chunks (RAG units)
create table if not exists knowledge_chunks (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references knowledge_documents(id) on delete cascade,
    chunk_index integer not null,                          -- order within document
    section_path text,                                     -- e.g. "IAS 21.8-12", "IFRS 15.AG1"
    heading text,                                          -- local heading if any
    content text not null,                                 -- the chunk's plain text
    tokens integer,                                        -- approx token count (optional)
    jurisdiction_override_id uuid references jurisdictions(id),
    effective_from date,
    effective_to date,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
);

comment on table knowledge_chunks is 'Chunked text units for RAG retrieval';
comment on column knowledge_chunks.section_path is 'Hierarchical section reference within document';
comment on column knowledge_chunks.jurisdiction_override_id is 'Jurisdiction-specific override if different from source';

create unique index if not exists idx_chunks_doc_chunkindex
    on knowledge_chunks (document_id, chunk_index);

create index if not exists idx_chunks_doc
    on knowledge_chunks (document_id);

create index if not exists idx_chunks_section_path
    on knowledge_chunks using gin (to_tsvector('english', section_path)) where section_path is not null;

-- Full-text search index on content
create index if not exists idx_chunks_content_fts
    on knowledge_chunks using gin (to_tsvector('english', content));

-- 6) Knowledge embeddings (vector)
-- Dimension: 1536 for text-embedding-3-small, 3072 for text-embedding-3-large
-- Adjust based on your embedding model
create table if not exists knowledge_embeddings (
    id bigserial primary key,
    chunk_id uuid not null unique references knowledge_chunks(id) on delete cascade,
    embedding vector(1536) not null,
    model text not null default 'text-embedding-3-small',
    created_at timestamptz not null default now()
);

comment on table knowledge_embeddings is 'Vector embeddings for semantic search';
comment on column knowledge_embeddings.model is 'Embedding model used (text-embedding-3-small, text-embedding-3-large, etc.)';

-- Vector similarity index (IVFFlat for approximate nearest neighbor search)
create index if not exists idx_embeddings_vector
    on knowledge_embeddings
    using ivfflat (embedding vector_cosine_ops)
    with (lists = 100);

-- 7) Ingestion jobs (track pipeline runs)
create table if not exists ingestion_jobs (
    id uuid primary key default gen_random_uuid(),
    source_id uuid references knowledge_sources(id) on delete set null,
    status text not null default 'PENDING' check (
        status in ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')
    ),
    started_at timestamptz,
    finished_at timestamptz,
    stats jsonb default '{}'::jsonb,        -- e.g. {"files":10,"chunks":230,"tokens":120000}
    error_message text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
);

comment on table ingestion_jobs is 'Track knowledge ingestion pipeline runs';
comment on column ingestion_jobs.stats is 'Ingestion statistics (files processed, chunks created, tokens, etc.)';

create index if not exists idx_ingestion_jobs_status
    on ingestion_jobs (status, created_at desc);

create index if not exists idx_ingestion_jobs_source
    on ingestion_jobs (source_id) where source_id is not null;

-- 8) Ingestion files (per PDF or HTML)
create table if not exists ingestion_files (
    id uuid primary key default gen_random_uuid(),
    job_id uuid not null references ingestion_jobs(id) on delete cascade,
    uri text not null,                         -- e.g. "https://ifrs.org/ias21.pdf"
    status text not null default 'PENDING' check (
        status in ('PENDING', 'DOWNLOADING', 'PARSING', 'CHUNKING', 'EMBEDDING', 'COMPLETED', 'FAILED')
    ),
    page_count integer,
    file_size_bytes bigint,
    metadata jsonb default '{}'::jsonb,
    error_message text,
    created_at timestamptz not null default now()
);

comment on table ingestion_files is 'Individual files processed during ingestion';

create index if not exists idx_ingestion_files_job
    on ingestion_files (job_id);

create index if not exists idx_ingestion_files_status
    on ingestion_files (status);

-- 9) Agent queries log (for auditability / debugging)
create table if not exists agent_queries_log (
    id bigserial primary key,
    agent_name text not null,                 -- e.g. "AccountantAI", "DeepSearch"
    user_id uuid,                             -- User who initiated the query
    query_text text not null,
    response_summary text,
    top_chunk_ids uuid[],                     -- the chunks used
    jurisdiction_id uuid references jurisdictions(id),
    created_at timestamptz not null default now(),
    latency_ms integer,
    metadata jsonb default '{}'::jsonb
);

comment on table agent_queries_log is 'Audit trail of agent queries and retrievals';

create index if not exists idx_agent_queries_agent
    on agent_queries_log (agent_name, created_at desc);

create index if not exists idx_agent_queries_user
    on agent_queries_log (user_id, created_at desc) where user_id is not null;

create index if not exists idx_agent_queries_jurisdiction
    on agent_queries_log (jurisdiction_id) where jurisdiction_id is not null;

-- 10) Seed common jurisdictions
insert into jurisdictions (code, name, region, metadata) values
    ('GLOBAL', 'Global', 'Worldwide', '{"description": "International standards applicable globally"}'::jsonb),
    ('RW', 'Rwanda', 'Africa', '{"currency": "RWF", "language": "en,fr,rw"}'::jsonb),
    ('MT', 'Malta', 'Europe', '{"currency": "EUR", "language": "en,mt"}'::jsonb),
    ('EU', 'European Union', 'Europe', '{"currency": "EUR", "language": "multi"}'::jsonb),
    ('US', 'United States', 'North America', '{"currency": "USD", "language": "en"}'::jsonb),
    ('UK', 'United Kingdom', 'Europe', '{"currency": "GBP", "language": "en"}'::jsonb)
on conflict (code) do nothing;

-- 11) Create helper function for semantic search
create or replace function search_knowledge_chunks(
    query_embedding vector(1536),
    match_threshold float default 0.75,
    match_count int default 10,
    filter_jurisdiction_id uuid default null,
    filter_types text[] default null
)
returns table (
    chunk_id uuid,
    document_id uuid,
    document_code text,
    document_title text,
    section_path text,
    content text,
    source_name text,
    source_type text,
    authority_level text,
    jurisdiction_code text,
    similarity float
)
language plpgsql
as $$
begin
    return query
    select
        kc.id as chunk_id,
        kd.id as document_id,
        kd.code as document_code,
        kd.title as document_title,
        kc.section_path,
        kc.content,
        ks.name as source_name,
        ks.type as source_type,
        ks.authority_level,
        j.code as jurisdiction_code,
        1 - (ke.embedding <=> query_embedding) as similarity
    from knowledge_embeddings ke
    join knowledge_chunks kc on ke.chunk_id = kc.id
    join knowledge_documents kd on kc.document_id = kd.id
    join knowledge_sources ks on kd.source_id = ks.id
    left join jurisdictions j on ks.jurisdiction_id = j.id
    where 1 - (ke.embedding <=> query_embedding) > match_threshold
        and (filter_jurisdiction_id is null or ks.jurisdiction_id = filter_jurisdiction_id or j.code = 'GLOBAL')
        and (filter_types is null or ks.type = any(filter_types))
    order by ke.embedding <=> query_embedding
    limit match_count;
end;
$$;

comment on function search_knowledge_chunks is 'Semantic search over knowledge chunks with jurisdiction and type filters';

-- 12) Create function for keyword search (fallback)
create or replace function keyword_search_chunks(
    search_query text,
    match_count int default 10,
    filter_jurisdiction_id uuid default null
)
returns table (
    chunk_id uuid,
    document_code text,
    document_title text,
    section_path text,
    content text,
    source_name text,
    authority_level text,
    rank float
)
language plpgsql
as $$
begin
    return query
    select
        kc.id as chunk_id,
        kd.code as document_code,
        kd.title as document_title,
        kc.section_path,
        kc.content,
        ks.name as source_name,
        ks.authority_level,
        ts_rank(to_tsvector('english', kc.content), plainto_tsquery('english', search_query)) as rank
    from knowledge_chunks kc
    join knowledge_documents kd on kc.document_id = kd.id
    join knowledge_sources ks on kd.source_id = ks.id
    left join jurisdictions j on ks.jurisdiction_id = j.id
    where to_tsvector('english', kc.content) @@ plainto_tsquery('english', search_query)
        and (filter_jurisdiction_id is null or ks.jurisdiction_id = filter_jurisdiction_id or j.code = 'GLOBAL')
    order by rank desc
    limit match_count;
end;
$$;

comment on function keyword_search_chunks is 'Full-text keyword search over knowledge chunks';
