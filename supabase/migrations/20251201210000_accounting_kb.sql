-- Accounting Knowledge Base Schema
-- Supports IFRS, IAS, ISA, GAAP, Tax Laws, ACCA, CPA resources with RAG

-- 1) Enable pgvector (if not already)
create extension if not exists vector;

-- 2) Jurisdictions
create table if not exists jurisdictions (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,         -- e.g. "RW", "EU", "US"
    name text not null,                -- e.g. "Rwanda"
    created_at timestamptz not null default now()
);

-- 3) Knowledge sources (IFRS, IAS, Tax laws, ACCA, etc.)
create table if not exists knowledge_sources (
    id uuid primary key default gen_random_uuid(),
    name text not null,                         -- e.g. "IFRS Foundation", "RRA"
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
    version text,                               -- e.g. "2023", "Rev. 2"
    effective_from date,
    effective_to date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_knowledge_sources_jurisdiction
    on knowledge_sources (jurisdiction_id);

-- 4) Knowledge documents (single standard/law/guide)
create table if not exists knowledge_documents (
    id uuid primary key default gen_random_uuid(),
    source_id uuid not null references knowledge_sources(id) on delete cascade,
    title text not null,                        -- e.g. "IAS 21: The Effects of Changes in Foreign Exchange Rates"
    code text,                                  -- e.g. "IAS 21", "IFRS 15", "RW-VAT-2022"
    language_code text default 'en',           -- e.g. "en", "fr", "rw"
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

create index if not exists idx_knowledge_documents_source
    on knowledge_documents (source_id);

create index if not exists idx_knowledge_documents_code
    on knowledge_documents (code);

-- 5) Knowledge chunks (RAG units)
create table if not exists knowledge_chunks (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references knowledge_documents(id) on delete cascade,
    chunk_index integer not null,                          -- order within document
    section_path text,                                     -- e.g. "IAS 21.8-12"
    heading text,                                          -- local heading if any
    content text not null,                                 -- the chunk's plain text
    tokens integer,                                        -- approx token count (optional)
    jurisdiction_override_id uuid references jurisdictions(id),
    effective_from date,
    effective_to date,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create unique index if not exists idx_chunks_doc_chunkindex
    on knowledge_chunks (document_id, chunk_index);

create index if not exists idx_chunks_doc
    on knowledge_chunks (document_id);

-- 6) Knowledge embeddings (vector)
-- NOTE: adjust vector dimension to match the model you'll use (e.g. 1536, 3072, etc.)
create table if not exists knowledge_embeddings (
    id bigserial primary key,
    chunk_id uuid not null unique references knowledge_chunks(id) on delete cascade,
    embedding vector(1536)
);

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
    stats jsonb default '{}'::jsonb,        -- e.g. {"files":10,"chunks":230,"tokens":120000}
    error_message text,
    created_at timestamptz not null default now()
);

-- 8) Ingestion files (per PDF or HTML)
create table if not exists ingestion_files (
    id uuid primary key default gen_random_uuid(),
    job_id uuid not null references ingestion_jobs(id) on delete cascade,
    uri text not null,                         -- e.g. "https://ifrs.org/ias21.pdf"
    status text not null default 'PENDING' check (
        status in ('PENDING', 'DOWNLOADING', 'PARSING', 'CHUNKING', 'EMBEDDING', 'COMPLETED', 'FAILED')
    ),
    page_count integer,
    metadata jsonb default '{}'::jsonb,
    error_message text,
    created_at timestamptz not null default now()
);

create index if not exists idx_ingestion_files_job
    on ingestion_files (job_id);

-- 9) Agent queries log (for auditability / debugging)
create table if not exists agent_queries_log (
    id bigserial primary key,
    agent_name text not null,                 -- e.g. "AccountantAI", "DeepSearch"
    user_id uuid,
    query_text text not null,
    response_summary text,
    top_chunk_ids uuid[],                     -- the chunks used
    jurisdiction_id uuid references jurisdictions(id),
    created_at timestamptz not null default now(),
    latency_ms integer,
    metadata jsonb default '{}'::jsonb
);

create index if not exists idx_agent_queries_agent
    on agent_queries_log (agent_name, created_at desc);

-- Seed initial jurisdictions
insert into jurisdictions (code, name) values
    ('GLOBAL', 'Global'),
    ('RW', 'Rwanda'),
    ('EU', 'European Union'),
    ('US', 'United States'),
    ('UK', 'United Kingdom')
on conflict (code) do nothing;
