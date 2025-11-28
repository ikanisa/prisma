-- =====================================================
-- Finance Review System: Row Level Security (RLS)
-- =====================================================
-- Purpose: Multi-tenant isolation for finance review tables
-- Security Model: JWT-based org_id claim enforcement
-- =====================================================

-- Enable RLS on all finance review tables
alter table ledger_entries enable row level security;
alter table support_docs enable row level security;
alter table tax_maps enable row level security;
alter table controls_logs enable row level security;
alter table embeddings enable row level security;

-- =====================================================
-- Helper Function: Extract org_id from JWT
-- =====================================================
-- Returns the current user's org_id from JWT claims
-- Used by RLS policies for tenant isolation
create or replace function current_org() 
returns uuid 
language sql 
stable 
as $$
  select nullif(
    (current_setting('request.jwt.claims', true)::jsonb->>'org_id'), 
    ''
  )::uuid
$$;

comment on function current_org is 'Extract org_id from JWT claims for RLS enforcement';

-- =====================================================
-- RLS Policies: Read Access
-- =====================================================

-- Ledger entries: read-only access to own org
create policy "org_read_ledger" 
  on ledger_entries 
  for select 
  using (org_id = current_org());

-- Support docs: read-only access to own org
create policy "org_read_docs"   
  on support_docs   
  for select 
  using (org_id = current_org());

-- Tax maps: read-only access to own org
create policy "org_read_tax"    
  on tax_maps       
  for select 
  using (org_id = current_org());

-- Controls logs: read-only access to own org
create policy "org_read_logs"   
  on controls_logs  
  for select 
  using (org_id = current_org());

-- Embeddings: read-only access to own org
create policy "org_read_emb"    
  on embeddings     
  for select 
  using (org_id = current_org());

-- =====================================================
-- RLS Policies: Write Access
-- =====================================================
-- Note: Primary write operations should use service role
-- Client writes are restricted to audit trail only

-- Controls logs: allow inserting review results
create policy "org_insert_logs" 
  on controls_logs 
  for insert 
  with check (org_id = current_org());

-- =====================================================
-- RLS Policies: Service Role Bypass
-- =====================================================
-- Service role bypasses RLS by default in Supabase
-- Use supabaseAdmin (service_role_key) for:
-- - Bulk ledger imports
-- - Document ingestion
-- - Embedding generation
-- - Cross-org admin operations

comment on policy "org_read_ledger" on ledger_entries is 'Tenant isolation: users can only read ledger entries for their org';
comment on policy "org_read_docs" on support_docs is 'Tenant isolation: users can only read documents for their org';
comment on policy "org_read_tax" on tax_maps is 'Tenant isolation: users can only read tax maps for their org';
comment on policy "org_read_logs" on controls_logs is 'Tenant isolation: users can only read control logs for their org';
comment on policy "org_read_emb" on embeddings is 'Tenant isolation: users can only read embeddings for their org';
comment on policy "org_insert_logs" on controls_logs is 'Allow users to insert control execution results for their org';
