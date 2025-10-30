-- =====================================================
-- Finance Review System: CFO + Auditor Agent Schema
-- =====================================================
-- Purpose: Support dual-agent financial review with RAG
-- for IKANISA/MoMo operations
-- Created: 2025-10-30
-- =====================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- =====================================================
-- Ledger Entries Table
-- =====================================================
-- Store all general ledger transactions for review
create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  sacco_id uuid,
  date date not null,
  account text not null,
  debit numeric(14,2),
  credit numeric(14,2),
  currency text default 'KES',
  counterparty_id uuid,
  source_txn_id text,
  memo text,
  created_by uuid,
  created_at timestamptz default now()
);

comment on table ledger_entries is 'General ledger entries for financial review and reconciliation';
comment on column ledger_entries.org_id is 'Organization/tenant identifier';
comment on column ledger_entries.sacco_id is 'SACCO identifier for multi-SACCO orgs';
comment on column ledger_entries.source_txn_id is 'Reference to source transaction (MoMo, bank, etc)';

-- =====================================================
-- Supporting Documents Table
-- =====================================================
-- Store document metadata and OCR text for evidence trails
create table if not exists support_docs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  source_txn_id text,
  url text not null,
  hash text,
  mime text,
  ocr_text text,
  uploaded_by uuid,
  created_at timestamptz default now()
);

comment on table support_docs is 'Supporting documentation for ledger entries (invoices, receipts, bank statements)';
comment on column support_docs.ocr_text is 'Extracted text from OCR for RAG search';

-- =====================================================
-- Tax Mapping Table
-- =====================================================
-- Define tax treatment rules per account and jurisdiction
-- Note: Removed unique constraint to allow multiple treatments per account-jurisdiction
-- (e.g., different rates based on transaction type, date ranges, or amount thresholds)
create table if not exists tax_maps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  account text not null,
  jurisdiction text not null,
  rule_ref text,
  treatment text,
  vat_rate numeric(5,2),
  withholding_rate numeric(5,2),
  notes text,
  valid_from date,
  valid_to date
);

comment on table tax_maps is 'Tax treatment mapping for accounts by jurisdiction';
comment on column tax_maps.rule_ref is 'Reference to tax regulation or ruling';
comment on column tax_maps.valid_from is 'Optional: Start date for this tax treatment';
comment on column tax_maps.valid_to is 'Optional: End date for this tax treatment';

-- =====================================================
-- Controls Log Table
-- =====================================================
-- Track control execution results and agent reviews
create table if not exists controls_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  control_key text not null,
  period text not null,
  status text check (status in ('GREEN','AMBER','RED')) not null,
  details jsonb,
  created_at timestamptz default now()
);

comment on table controls_logs is 'Audit trail of control executions and review outcomes';
comment on column controls_logs.control_key is 'Identifier for control type (e.g., daily_review, float_reconciliation)';
comment on column controls_logs.details is 'JSON containing agent outputs, issues, and recommendations';

-- =====================================================
-- Embeddings Table
-- =====================================================
-- Store vector embeddings for RAG retrieval
create table if not exists embeddings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  object_type text check (object_type in ('ledger','doc')) not null,
  object_id uuid not null,
  vector vector(1536),
  chunk_text text,
  created_at timestamptz default now(),
  unique(org_id, object_type, object_id)
);

comment on table embeddings is 'Vector embeddings for semantic search over ledger and document text';
comment on column embeddings.vector is 'OpenAI text-embedding-3-small vector (1536 dimensions)';

-- =====================================================
-- Indexes for Performance
-- =====================================================
create index if not exists idx_ledger_org_date on ledger_entries(org_id, date);
create index if not exists idx_ledger_org_account on ledger_entries(org_id, account);
create index if not exists idx_ledger_source_txn on ledger_entries(org_id, source_txn_id) where source_txn_id is not null;
create index if not exists idx_docs_org_txn on support_docs(org_id, source_txn_id);
create index if not exists idx_taxmaps_org_account on tax_maps(org_id, account);
create index if not exists idx_controls_org_key_period on controls_logs(org_id, control_key, period);
create index if not exists idx_embeddings_org_type on embeddings(org_id, object_type);

-- IVFFlat index for vector similarity search
-- Lists parameter tuned for expected data volume (100 lists for ~10k-100k rows)
create index if not exists idx_embeddings_vector on embeddings 
  using ivfflat (vector vector_cosine_ops) 
  with (lists = 100);

-- =====================================================
-- RPC: Vector Similarity Search
-- =====================================================
-- Hybrid retrieval: org-scoped vector search with similarity threshold
create or replace function match_embeddings (
  p_org_id uuid,
  query_vector vector(1536),
  match_threshold float,
  match_count int
)
returns table(
  object_id uuid, 
  object_type text, 
  chunk_text text, 
  similarity float
)
language sql stable as $$
  select 
    object_id, 
    object_type, 
    chunk_text,
    1 - (embeddings.vector <=> query_vector) as similarity
  from embeddings
  where org_id = p_org_id
    and embeddings.vector is not null
    and 1 - (embeddings.vector <=> query_vector) > match_threshold
  order by similarity desc
  limit match_count;
$$;

comment on function match_embeddings is 'Semantic search for ledger and document chunks by cosine similarity';
