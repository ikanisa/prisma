-- Accounting Knowledge Base for DeepSearch Agent
-- Supports IFRS, IAS, ISA, GAAP, Tax Laws, ACCA, CPA materials
-- Date: 2025-12-01

-- 1) Enable pgvector extension (if not already enabled)
create extension if not exists vector;

-- 2) Jurisdictions table
create table if not exists jurisdictions (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    name text not null,
    created_at timestamptz not null default now()
);

comment on table jurisdictions is 'Legal jurisdictions for accounting and tax knowledge (e.g., Rwanda, EU, US, GLOBAL)';
comment on column jurisdictions.code is 'ISO country code or custom code (e.g., RW, EU, US, GLOBAL)';

-- 3) Knowledge sources (IFRS, IAS, Tax laws, ACCA, etc.)
create table if not exists knowledge_sources (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    type text not null check (
        type in (
            'IFRS', 'IAS', 'ISA', 'GAAP', 'TAX_LAW',
            'ACCA', 'CPA', 'OECD', 'INTERNAL', 'OTHER'
        )
    ),
    jurisdiction_id uuid references jurisdictions(id),
    authority_level text not null default 'SECONDARY' check (
        authority_level in ('PRIMARY', 'SECONDARY', 'INTERNAL')
    ),
    url text,
    description text,
    version text,
    effective_from date,
    effective_to date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table knowledge_sources is 'Authoritative accounting and tax knowledge sources';
comment on column knowledge_sources.type is 'Type of knowledge source (IFRS, IAS, ISA, GAAP, TAX_LAW, etc.)';
comment on column knowledge_sources.authority_level is 'Authority level: PRIMARY (laws/standards), SECONDARY (commentary), INTERNAL (company policy)';

create index if not exists idx_knowledge_sources_jurisdiction
    on knowledge_sources (jurisdiction_id);

create index if not exists idx_knowledge_sources_type
    on knowledge_sources (type);

-- 4) Knowledge documents (single standard/law/guide)
create table if not exists knowledge_documents (
    id uuid primary key default gen_random_uuid(),
    source_id uuid not null references knowledge_sources(id) on delete cascade,
    title text not null,
    code text,
    language_code text default 'en',
    status text not null default 'ACTIVE' check (
        status in ('ACTIVE', 'DEPRECATED', 'DRAFT')
    ),
    version text,
    effective_from date,
    effective_to date,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table knowledge_documents is 'Individual accounting standards, tax laws, or guidance documents';
comment on column knowledge_documents.code is 'Standard code (e.g., IAS 21, IFRS 15, RW-VAT-2022)';

create index if not exists idx_knowledge_documents_source
    on knowledge_documents (source_id);

create index if not exists idx_knowledge_documents_code
    on knowledge_documents (code);

create index if not exists idx_knowledge_documents_status
    on knowledge_documents (status);

-- 5) Knowledge chunks (RAG units)
create table if not exists knowledge_chunks (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references knowledge_documents(id) on delete cascade,
    chunk_index integer not null,
    section_path text,
    heading text,
    content text not null,
    tokens integer,
    jurisdiction_override_id uuid references jurisdictions(id),
    effective_from date,
    effective_to date,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
);

comment on table knowledge_chunks is 'Text chunks for RAG retrieval';
comment on column knowledge_chunks.chunk_index is 'Sequential order within document';
comment on column knowledge_chunks.section_path is 'Document section reference (e.g., IAS 21.8-12)';
comment on column knowledge_chunks.tokens is 'Approximate token count for this chunk';

create unique index if not exists idx_chunks_doc_chunkindex
    on knowledge_chunks (document_id, chunk_index);

create index if not exists idx_chunks_doc
    on knowledge_chunks (document_id);

create index if not exists idx_chunks_section_path
    on knowledge_chunks (section_path) where section_path is not null;

-- 6) Knowledge embeddings (vector)
-- Dimension: 1536 for text-embedding-3-small, 3072 for text-embedding-3-large
create table if not exists knowledge_embeddings (
    id bigserial primary key,
    chunk_id uuid not null unique references knowledge_chunks(id) on delete cascade,
    embedding vector(1536) not null,
    model text not null default 'text-embedding-3-small',
    created_at timestamptz not null default now()
);

comment on table knowledge_embeddings is 'Vector embeddings for semantic search';
comment on column knowledge_embeddings.model is 'Embedding model used (e.g., text-embedding-3-small, text-embedding-3-large)';

-- IVFFlat index for vector similarity search
create index if not exists idx_embeddings_vector
    on knowledge_embeddings
    using ivfflat (embedding vector_cosine_ops)
    with (lists = 100);

-- 7) Ingestion jobs (track pipeline runs)
create table if not exists ingestion_jobs (
    id uuid primary key default gen_random_uuid(),
    source_id uuid references knowledge_sources(id) on delete set null,
    status text not null default 'PENDING' check (
        status in ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')
    ),
    started_at timestamptz,
    finished_at timestamptz,
    stats jsonb default '{}'::jsonb,
    error_message text,
    created_at timestamptz not null default now()
);

comment on table ingestion_jobs is 'Tracks knowledge ingestion pipeline runs';
comment on column ingestion_jobs.stats is 'Job statistics (e.g., {"files":10,"chunks":230,"tokens":120000})';

create index if not exists idx_ingestion_jobs_source
    on ingestion_jobs (source_id);

create index if not exists idx_ingestion_jobs_status
    on ingestion_jobs (status);

-- 8) Ingestion files (per PDF or HTML)
create table if not exists ingestion_files (
    id uuid primary key default gen_random_uuid(),
    job_id uuid not null references ingestion_jobs(id) on delete cascade,
    uri text not null,
    status text not null default 'PENDING' check (
        status in ('PENDING', 'DOWNLOADING', 'PARSING', 'CHUNKING', 'EMBEDDING', 'COMPLETED', 'FAILED')
    ),
    page_count integer,
    metadata jsonb default '{}'::jsonb,
    error_message text,
    created_at timestamptz not null default now()
);

comment on table ingestion_files is 'Tracks individual files within ingestion jobs';
comment on column ingestion_files.uri is 'Source URI (e.g., https://ifrs.org/ias21.pdf)';

create index if not exists idx_ingestion_files_job
    on ingestion_files (job_id);

create index if not exists idx_ingestion_files_status
    on ingestion_files (status);

-- 9) Agent queries log (for auditability / debugging)
create table if not exists agent_queries_log (
    id bigserial primary key,
    agent_name text not null,
    user_id uuid,
    query_text text not null,
    response_summary text,
    top_chunk_ids uuid[],
    jurisdiction_id uuid references jurisdictions(id),
    created_at timestamptz not null default now(),
    latency_ms integer,
    metadata jsonb default '{}'::jsonb
);

comment on table agent_queries_log is 'Audit trail of agent queries and retrieved chunks';
comment on column agent_queries_log.top_chunk_ids is 'Array of chunk IDs used in the response';

create index if not exists idx_agent_queries_agent
    on agent_queries_log (agent_name, created_at desc);

create index if not exists idx_agent_queries_user
    on agent_queries_log (user_id, created_at desc) where user_id is not null;

-- Seed initial jurisdictions
insert into jurisdictions (code, name) values
    ('GLOBAL', 'Global / International'),
    ('RW', 'Rwanda'),
    ('EU', 'European Union'),
    ('US', 'United States'),
    ('UK', 'United Kingdom'),
    ('KE', 'Kenya'),
    ('UG', 'Uganda'),
    ('TZ', 'Tanzania')
on conflict (code) do nothing;

-- Helper function: semantic search
create or replace function search_knowledge_semantic(
    query_embedding vector(1536),
    match_threshold float default 0.75,
    match_count int default 10,
    filter_jurisdiction_id uuid default null,
    filter_types text[] default null,
    filter_authority_levels text[] default null
)
returns table (
    chunk_id uuid,
    document_id uuid,
    document_code text,
    document_title text,
    source_name text,
    source_type text,
    authority_level text,
    jurisdiction_code text,
    section_path text,
    heading text,
    content text,
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
        ks.name as source_name,
        ks.type as source_type,
        ks.authority_level,
        j.code as jurisdiction_code,
        kc.section_path,
        kc.heading,
        kc.content,
        1 - (ke.embedding <=> query_embedding) as similarity
    from knowledge_embeddings ke
    join knowledge_chunks kc on kc.id = ke.chunk_id
    join knowledge_documents kd on kd.id = kc.document_id
    join knowledge_sources ks on ks.id = kd.source_id
    left join jurisdictions j on j.id = ks.jurisdiction_id
    where
        1 - (ke.embedding <=> query_embedding) >= match_threshold
        and kd.status = 'ACTIVE'
        and (filter_jurisdiction_id is null or ks.jurisdiction_id = filter_jurisdiction_id)
        and (filter_types is null or ks.type = any(filter_types))
        and (filter_authority_levels is null or ks.authority_level = any(filter_authority_levels))
    order by ke.embedding <=> query_embedding
    limit match_count;
end;
$$;

comment on function search_knowledge_semantic is 'Semantic search across knowledge base using vector similarity';
