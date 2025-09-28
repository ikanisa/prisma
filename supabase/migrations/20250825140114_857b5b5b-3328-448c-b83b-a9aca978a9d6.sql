-- =========================
-- 0) Extensions & Schema
-- =========================
create extension if not exists pgcrypto;
create extension if not exists vector;
create extension if not exists btree_gin;
create extension if not exists pg_trgm;
create extension if not exists plpgsql;
create schema if not exists app;
-- =========================
-- 1) Enums
-- =========================
do $$ begin
  create type org_role as enum ('admin','manager','staff','client');
exception when duplicate_object then null; end $$;
do $$ begin
  create type engagement_status as enum ('planned','active','completed','archived');
exception when duplicate_object then null; end $$;
do $$ begin
  create type severity_level as enum ('info','warn','error');
exception when duplicate_object then null; end $$;
-- =========================
-- 2) Core tenancy & access
-- =========================
create table if not exists organizations(
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  plan text,
  created_at timestamptz not null default now()
);
-- App-level user profile referencing auth.users
create table if not exists app_users(
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now()
);
create table if not exists members(
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references app_users(user_id) on delete cascade,
  role org_role not null default 'staff',
  primary key(org_id, user_id)
);
create table if not exists api_keys(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  hashed_key text not null, -- sha256 of plaintext
  scope jsonb not null default '{}'::jsonb,
  created_by uuid references app_users(user_id),
  created_at timestamptz not null default now()
);
-- =========================
-- 3) Helper functions (app.*)
-- =========================

-- Current user (from Supabase auth)
create or replace function app.current_user_id()
returns uuid language sql stable as $$
  select auth.uid();
$$;
-- Update timestamp trigger
create or replace function app.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
-- Rank roles for comparisons
create or replace function app.role_rank(role_in org_role)
returns int language sql immutable as $$
  select case role_in
    when 'admin' then 4
    when 'manager' then 3
    when 'staff' then 2
    when 'client' then 1
    else 0 end;
$$;
-- Is member with minimum role?
create or replace function app.is_org_member(p_org uuid, p_min_role org_role default 'staff')
returns boolean
language sql stable as $$
  select exists (
    select 1 from members m
    where m.org_id = p_org
      and m.user_id = app.current_user_id()
      and app.role_rank(m.role) >= app.role_rank(p_min_role)
  );
$$;
-- Is admin?
create or replace function app.is_org_admin(p_org uuid)
returns boolean language sql stable as $$
  select app.is_org_member(p_org, 'admin'::org_role);
$$;
-- Optional: convenience setter for SQL clients to scope queries (not used by policies)
create or replace function app.set_tenant(p_org uuid)
returns void language plpgsql as $$
begin
  perform set_config('app.current_org', p_org::text, true);
end;
$$;
-- Create API key (returns plaintext once), stores SHA-256 hash
create or replace function app.create_api_key(p_org_slug text, p_name text, p_scope jsonb default '{}'::jsonb)
returns table(id uuid, key_plain text)
language plpgsql security definer as $$
declare
  v_org uuid;
  v_key bytea;
  v_key_plain text;
  v_hash text;
begin
  select id into v_org from organizations where slug = p_org_slug;
  if v_org is null then
    raise exception 'Unknown org slug %', p_org_slug;
  end if;

  -- Only admins may create keys
  if not app.is_org_admin(v_org) then
    raise exception 'Forbidden';
  end if;

  v_key := gen_random_bytes(32);
  v_key_plain := 'pk_' || encode(v_key, 'base64url');
  v_hash := encode(digest(v_key_plain, 'sha256'), 'hex');

  insert into api_keys(org_id, name, hashed_key, scope, created_by)
  values (v_org, p_name, v_hash, coalesce(p_scope, '{}'::jsonb), app.current_user_id())
  returning api_keys.id into id;

  key_plain := v_key_plain;
  return next;
end;
$$;

-- =========================
-- 4) RAG & ingestion
-- =========================
create table if not exists documents(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  source_name text not null,
  source_url text,
  mime text,
  bytes bigint,
  checksum text,
  jurisdiction text,
  effective_date date,
  version text,
  created_at timestamptz not null default now()
);
create table if not exists chunks(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  content_hash text generated always as (encode(digest(coalesce(content,''), 'sha256'), 'hex')) stored,
  embedding vector(1536),
  embed_model text,
  last_embedded_at timestamptz not null default now(),
  unique (content_hash)
);
create index if not exists idx_chunks_org on chunks(org_id);
-- vector index: tune lists post-load if large
do $$ begin
  execute 'create index if not exists idx_chunks_vec on chunks using ivfflat (embedding vector_cosine_ops) with (lists=100);';
exception when others then null; end $$;
create table if not exists ingest_jobs(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  status text not null default 'queued',
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
-- =========================
-- 5) Agent sessions, logs & idempotency
-- =========================
create table if not exists agent_sessions(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references app_users(user_id),
  kind text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create table if not exists agent_logs(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  session_id uuid references agent_sessions(id),
  route text,
  model text,
  tools jsonb,
  prompt_tokens int,
  completion_tokens int,
  cost_usd numeric(10,4),
  latency_ms int,
  severity severity_level default 'info',
  citations jsonb,
  answer_preview text,
  created_at timestamptz not null default now()
);
create index if not exists idx_logs_org_time on agent_logs(org_id, created_at desc);
create table if not exists idempotency_keys(
  key text primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  route text not null,
  created_at timestamptz not null default now()
);
create table if not exists errors(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  workflow text,
  message text,
  stack text,
  created_at timestamptz not null default now()
);
-- =========================
-- 6) Audit (ISA/ISQM)
-- =========================
create table if not exists independence_checks(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  client_id text not null,
  threats jsonb not null default '[]'::jsonb,
  safeguards jsonb not null default '[]'::jsonb,
  conclusion text,
  created_at timestamptz not null default now()
);
create table if not exists engagements(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  client_id text not null,
  year int not null,
  status engagement_status not null default 'planned',
  frf text,
  eqr_required boolean not null default false,
  materiality_set_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_engagements_touch before update on engagements
  for each row execute function app.touch_updated_at();
create table if not exists risks(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  engagement_id uuid not null references engagements(id) on delete cascade,
  assertion text,
  description text,
  likelihood int,
  impact int,
  response_plan jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_risks_touch before update on risks
  for each row execute function app.touch_updated_at();
create index if not exists idx_risks_org_eng on risks(org_id, engagement_id);
create table if not exists controls(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  process text,
  description text,
  frequency text,
  owner text,
  key_control boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_controls_touch before update on controls
  for each row execute function app.touch_updated_at();
create table if not exists tests(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  control_id uuid not null references controls(id) on delete cascade,
  approach text,
  sample_method text,
  sample_size int,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_tests_touch before update on tests
  for each row execute function app.touch_updated_at();
create table if not exists samples(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  test_id uuid not null references tests(id) on delete cascade,
  item_ref text,
  selected_by text,
  result text,
  exception_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_samples_touch before update on samples
  for each row execute function app.touch_updated_at();
create table if not exists materiality_sets(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  engagement_id uuid not null references engagements(id) on delete cascade,
  basis text,
  basis_amount numeric,
  pm numeric,
  te_threshold numeric,
  rationale text,
  created_at timestamptz not null default now()
);
create table if not exists misstatements(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  engagement_id uuid not null references engagements(id) on delete cascade,
  amount numeric,
  classification text,
  corrected boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists kams(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  engagement_id uuid not null references engagements(id) on delete cascade,
  title text,
  rationale text,
  ref_links jsonb,
  created_at timestamptz not null default now()
);
create table if not exists workpapers(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  engagement_id uuid not null references engagements(id) on delete cascade,
  drive_url text,
  type text,
  linked_evidence jsonb,
  created_at timestamptz not null default now()
);
-- =========================
-- 7) Accounting (IFRS)
-- =========================
create table if not exists chart_of_accounts(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  code text not null,
  name text not null,
  type text not null,
  parent_id uuid references chart_of_accounts(id) on delete set null,
  unique(org_id, code)
);
create table if not exists vendors(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  vat_number text,
  country text,
  extra jsonb not null default '{}'::jsonb
);
create index if not exists idx_vendors_org_name on vendors(org_id, name);
create table if not exists categories(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text
);
create unique index if not exists uq_categories_org_name on categories(org_id, name);
create table if not exists transactions(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  date date not null,
  vendor_id uuid references vendors(id) on delete set null,
  description text,
  amount numeric not null,
  currency text not null default 'EUR',
  category_id uuid references categories(id) on delete set null,
  vat_code text,
  confidence numeric,
  source_ref text,
  created_at timestamptz not null default now()
);
create index if not exists idx_tx_org_date on transactions(org_id, date);
-- Journal (double-entry) for approved postings
create table if not exists journal_entries(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  date date not null,
  description text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  posted_at timestamptz
);
create table if not exists journal_lines(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  entry_id uuid not null references journal_entries(id) on delete cascade,
  account_id uuid not null references chart_of_accounts(id) on delete restrict,
  debit numeric not null default 0,
  credit numeric not null default 0,
  memo text,
  check (debit >= 0 and credit >= 0),
  check (not (debit = 0 and credit = 0))
);
create index if not exists idx_jlines_entry on journal_lines(entry_id);
create table if not exists policies(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  expr_sql text not null,
  severity text not null default 'warn',
  created_at timestamptz not null default now()
);
create table if not exists vendor_category_mappings(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  vendor_id uuid not null references vendors(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  vat_code text,
  confidence numeric,
  examples jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique(org_id, vendor_id)
);
-- =========================
-- 8) Tax
-- =========================
create table if not exists vat_rules(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  rule jsonb not null default '{}'::jsonb,
  jurisdiction text,
  effective_from date,
  effective_to date
);
create index if not exists idx_vat_rules_org_time on vat_rules(org_id, effective_from desc);
create index if not exists idx_vat_rules_rule_gin on vat_rules using gin (rule);
create table if not exists vat_returns(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft',
  totals jsonb not null default '{}'::jsonb,
  xml bytea
);
create table if not exists vies_checks(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  counterparty_vat text not null,
  result jsonb not null,
  checked_at timestamptz not null default now()
);
create table if not exists cit_computations(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  year int not null,
  steps jsonb not null default '[]'::jsonb,
  tax_due numeric
);
-- =========================
-- 9) Portal / PBC
-- =========================
create table if not exists portal_sessions(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null
);
create table if not exists pbc_requests(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  engagement_id uuid not null references engagements(id) on delete cascade,
  title text not null,
  due_on date,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_pbcr_touch before update on pbc_requests
  for each row execute function app.touch_updated_at();
create table if not exists pbc_items(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  request_id uuid not null references pbc_requests(id) on delete cascade,
  label text not null,
  status text not null default 'pending',
  storage_path text, -- Supabase Storage path "aat-intake/org/{org_id}/..."
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_pbci_touch before update on pbc_items
  for each row execute function app.touch_updated_at();
-- =========================
-- 10) Helpful indexes
-- =========================
-- Ensure engagements tracking columns exist for downstream indexes
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS year int;
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS frf text;
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS eqr_required boolean DEFAULT false;
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS materiality_set_id uuid;
create index if not exists idx_docs_org_time on documents(org_id, created_at desc);
create index if not exists idx_eng_org_year on engagements(org_id, year);
create index if not exists idx_tx_org_created on transactions(org_id, created_at desc);
create index if not exists idx_apikeys_org_time on api_keys(org_id, created_at desc);
-- =========================
-- 11) RLS policies
-- =========================
-- Enable RLS
alter table organizations enable row level security;
alter table app_users enable row level security;
alter table members enable row level security;
alter table api_keys enable row level security;
alter table documents enable row level security;
alter table chunks enable row level security;
alter table ingest_jobs enable row level security;
alter table agent_sessions enable row level security;
alter table agent_logs enable row level security;
alter table idempotency_keys enable row level security;
alter table errors enable row level security;
alter table independence_checks enable row level security;
alter table engagements enable row level security;
alter table risks enable row level security;
alter table controls enable row level security;
alter table tests enable row level security;
alter table samples enable row level security;
alter table materiality_sets enable row level security;
alter table misstatements enable row level security;
alter table kams enable row level security;
alter table workpapers enable row level security;
alter table chart_of_accounts enable row level security;
alter table vendors enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table journal_entries enable row level security;
alter table journal_lines enable row level security;
alter table policies enable row level security;
alter table vendor_category_mappings enable row level security;
alter table vat_rules enable row level security;
alter table vat_returns enable row level security;
alter table vies_checks enable row level security;
alter table cit_computations enable row level security;
alter table portal_sessions enable row level security;
alter table pbc_requests enable row level security;
alter table pbc_items enable row level security;
-- Organizations & profiles
drop policy if exists orgs_read on organizations;
create policy orgs_read on organizations
  for select using (exists (select 1 from members m where m.org_id = organizations.id and m.user_id = app.current_user_id()));
drop policy if exists app_users_self on app_users;
create policy app_users_self on app_users
  for all using (app_users.user_id = app.current_user_id())
  with check (app_users.user_id = app.current_user_id());
drop policy if exists members_read on members;
create policy members_read on members
  for select using (members.user_id = app.current_user_id()
     or exists (select 1 from members m where m.org_id = members.org_id and m.user_id = app.current_user_id() and app.role_rank(m.role) >= 3));
-- manager+

drop policy if exists members_write on members;
create policy members_write on members
  for insert with check (exists (select 1 from members m where m.org_id = members.org_id and m.user_id = app.current_user_id() and app.role_rank(m.role) >= 4)); -- admin
drop policy if exists members_update on members;
create policy members_update on members
  for update using (exists (select 1 from members m where m.org_id = members.org_id and m.user_id = app.current_user_id() and app.role_rank(m.role) >= 4))
  with check (exists (select 1 from members m where m.org_id = members.org_id and m.user_id = app.current_user_id() and app.role_rank(m.role) >= 4));
-- API keys: admin only
drop policy if exists apikeys_read on api_keys;
create policy apikeys_read on api_keys
  for select using (app.is_org_admin(api_keys.org_id));
drop policy if exists apikeys_write on api_keys;
create policy apikeys_write on api_keys
  for all using (app.is_org_admin(api_keys.org_id))
  with check (app.is_org_admin(api_keys.org_id));
-- Generic tenant read/write helpers
-- Read for any member; write for staff+
-- Apply to all tenant tables below with simple (org_id) columns

-- RAG
drop policy if exists docs_rw on documents;
create policy docs_rw on documents
  for all using (app.is_org_member(documents.org_id, 'staff'))
  with check (app.is_org_member(documents.org_id, 'staff'));
drop policy if exists chunks_r on chunks;
create policy chunks_r on chunks
  for select using (app.is_org_member(chunks.org_id, 'staff'));
drop policy if exists ingest_rw on ingest_jobs;
create policy ingest_rw on ingest_jobs
  for all using (app.is_org_member(ingest_jobs.org_id, 'staff'))
  with check (app.is_org_member(ingest_jobs.org_id, 'staff'));
-- Sessions & logs
drop policy if exists sessions_rw on agent_sessions;
create policy sessions_rw on agent_sessions
  for all using (app.is_org_member(agent_sessions.org_id, 'staff'))
  with check (app.is_org_member(agent_sessions.org_id, 'staff'));
drop policy if exists logs_r on agent_logs;
create policy logs_r on agent_logs
  for select using (app.is_org_member(agent_logs.org_id, 'staff'));
drop policy if exists idem_rw on idempotency_keys;
create policy idem_rw on idempotency_keys
  for all using (app.is_org_member(idempotency_keys.org_id, 'staff'))
  with check (app.is_org_member(idempotency_keys.org_id, 'staff'));
drop policy if exists errors_r on errors;
create policy errors_r on errors
  for select using (app.is_org_member(errors.org_id, 'manager'));
-- read errors manager+

-- Audit
drop policy if exists audit_rw_engagements on engagements;
create policy audit_rw_engagements on engagements
  for all using (app.is_org_member(engagements.org_id, 'staff'))
  with check (app.is_org_member(engagements.org_id, 'staff'));
drop policy if exists audit_rw_risks on risks;
create policy audit_rw_risks on risks
  for all using (app.is_org_member(risks.org_id, 'staff'))
  with check (app.is_org_member(risks.org_id, 'staff'));
drop policy if exists audit_rw_controls on controls;
create policy audit_rw_controls on controls
  for all using (app.is_org_member(controls.org_id, 'staff'))
  with check (app.is_org_member(controls.org_id, 'staff'));
drop policy if exists audit_rw_tests on tests;
create policy audit_rw_tests on tests
  for all using (app.is_org_member(tests.org_id, 'staff'))
  with check (app.is_org_member(tests.org_id, 'staff'));
drop policy if exists audit_rw_samples on samples;
create policy audit_rw_samples on samples
  for all using (app.is_org_member(samples.org_id, 'staff'))
  with check (app.is_org_member(samples.org_id, 'staff'));
drop policy if exists audit_rw_mats on materiality_sets;
create policy audit_rw_mats on materiality_sets
  for all using (app.is_org_member(materiality_sets.org_id, 'staff'))
  with check (app.is_org_member(materiality_sets.org_id, 'staff'));
drop policy if exists audit_rw_misc on misstatements;
create policy audit_rw_misc on misstatements
  for all using (app.is_org_member(misstatements.org_id, 'staff'))
  with check (app.is_org_member(misstatements.org_id, 'staff'));
drop policy if exists audit_rw_kams on kams;
create policy audit_rw_kams on kams
  for all using (app.is_org_member(kams.org_id, 'staff'))
  with check (app.is_org_member(kams.org_id, 'staff'));
drop policy if exists audit_rw_workpapers on workpapers;
create policy audit_rw_workpapers on workpapers
  for all using (app.is_org_member(workpapers.org_id, 'staff'))
  with check (app.is_org_member(workpapers.org_id, 'staff'));
-- Accounting
drop policy if exists coa_rw on chart_of_accounts;
create policy coa_rw on chart_of_accounts
  for all using (app.is_org_member(chart_of_accounts.org_id, 'staff'))
  with check (app.is_org_member(chart_of_accounts.org_id, 'staff'));
drop policy if exists vendors_rw on vendors;
create policy vendors_rw on vendors
  for all using (app.is_org_member(vendors.org_id, 'staff'))
  with check (app.is_org_member(vendors.org_id, 'staff'));
drop policy if exists categories_rw on categories;
create policy categories_rw on categories
  for all using (app.is_org_member(categories.org_id, 'staff'))
  with check (app.is_org_member(categories.org_id, 'staff'));
drop policy if exists tx_rw on transactions;
create policy tx_rw on transactions
  for all using (app.is_org_member(transactions.org_id, 'staff'))
  with check (app.is_org_member(transactions.org_id, 'staff'));
drop policy if exists jentries_rw on journal_entries;
create policy jentries_rw on journal_entries
  for all using (app.is_org_member(journal_entries.org_id, 'staff'))
  with check (app.is_org_member(journal_entries.org_id, 'staff'));
drop policy if exists jlines_rw on journal_lines;
create policy jlines_rw on journal_lines
  for all using (app.is_org_member(journal_lines.org_id, 'staff'))
  with check (app.is_org_member(journal_lines.org_id, 'staff'));
drop policy if exists policies_admin on policies;
create policy policies_admin on policies
  for all using (app.is_org_member(policies.org_id, 'manager'))
  with check (app.is_org_member(policies.org_id, 'manager'));
drop policy if exists map_rw on vendor_category_mappings;
create policy map_rw on vendor_category_mappings
  for all using (app.is_org_member(vendor_category_mappings.org_id, 'staff'))
  with check (app.is_org_member(vendor_category_mappings.org_id, 'staff'));
-- Tax
drop policy if exists vat_rules_rw on vat_rules;
create policy vat_rules_rw on vat_rules
  for all using (app.is_org_member(vat_rules.org_id, 'staff'))
  with check (app.is_org_member(vat_rules.org_id, 'staff'));
drop policy if exists vat_returns_rw on vat_returns;
create policy vat_returns_rw on vat_returns
  for all using (app.is_org_member(vat_returns.org_id, 'staff'))
  with check (app.is_org_member(vat_returns.org_id, 'staff'));
drop policy if exists vies_r on vies_checks;
create policy vies_r on vies_checks
  for select using (app.is_org_member(vies_checks.org_id, 'staff'));
drop policy if exists cit_rw on cit_computations;
create policy cit_rw on cit_computations
  for all using (app.is_org_member(cit_computations.org_id, 'staff'))
  with check (app.is_org_member(cit_computations.org_id, 'staff'));
-- Portal / PBC
drop policy if exists portal_rw on portal_sessions;
create policy portal_rw on portal_sessions
  for all using (app.is_org_member(portal_sessions.org_id, 'staff'))
  with check (app.is_org_member(portal_sessions.org_id, 'staff'));
drop policy if exists pbcr_rw on pbc_requests;
create policy pbcr_rw on pbc_requests
  for all using (app.is_org_member(pbc_requests.org_id, 'staff'))
  with check (app.is_org_member(pbc_requests.org_id, 'staff'));
drop policy if exists pbci_rw on pbc_items;
create policy pbci_rw on pbc_items
  for all using (app.is_org_member(pbc_items.org_id, 'staff'))
  with check (app.is_org_member(pbc_items.org_id, 'staff'));
