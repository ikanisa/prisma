-- Schema definitions for ISA 720 / ISA 710 "Other Information" workflow
-- This script introduces storage for uploaded documents, reviewer flags,
-- and comparative checklist entries together with hardened RLS policies.

create table if not exists public.other_information_docs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  title text not null,
  storage_path text not null,
  status text not null default 'uploaded',
  mime_type text,
  file_size bigint,
  checksum text,
  metadata jsonb default '{}'::jsonb,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists other_information_docs_org_eng on public.other_information_docs(org_id, engagement_id, uploaded_at desc);

create trigger set_other_information_docs_updated_at
  before update on public.other_information_docs
  for each row execute function public.handle_updated_at();

alter table public.other_information_docs enable row level security;

create policy if not exists other_information_docs_select on public.other_information_docs
  for select using (app.is_org_member(org_id, 'staff'));

create policy if not exists other_information_docs_insert on public.other_information_docs
  for insert with check (app.is_org_member(org_id, 'staff'));

create policy if not exists other_information_docs_update on public.other_information_docs
  for update using (app.is_org_member(org_id, 'staff'))
  with check (app.is_org_member(org_id, 'staff'));

create policy if not exists other_information_docs_delete on public.other_information_docs
  for delete using (app.is_org_member(org_id, 'manager'));

create table if not exists public.oi_flags (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  document_id uuid references public.other_information_docs(id) on delete cascade,
  category text not null,
  severity text not null default 'medium',
  status text not null default 'open',
  description text not null,
  resolution_notes text,
  raised_by uuid references auth.users(id) on delete set null,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

create index if not exists oi_flags_org_eng_status on public.oi_flags(org_id, engagement_id, status);
create index if not exists oi_flags_document on public.oi_flags(document_id);

create trigger set_oi_flags_updated_at
  before update on public.oi_flags
  for each row execute function public.handle_updated_at();

alter table public.oi_flags enable row level security;

create policy if not exists oi_flags_select on public.oi_flags
  for select using (app.is_org_member(org_id, 'staff'));

create policy if not exists oi_flags_insert on public.oi_flags
  for insert with check (app.is_org_member(org_id, 'staff'));

create policy if not exists oi_flags_update on public.oi_flags
  for update using (app.is_org_member(org_id, 'staff'))
  with check (app.is_org_member(org_id, 'staff'));

create policy if not exists oi_flags_delete on public.oi_flags
  for delete using (app.is_org_member(org_id, 'manager'));

create table if not exists public.comparatives_checks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  check_key text not null,
  assertion text not null,
  status text not null default 'pending',
  notes text,
  linked_flag_id uuid references public.oi_flags(id) on delete set null,
  checked_by uuid references auth.users(id) on delete set null,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, engagement_id, check_key)
);

create index if not exists comparatives_checks_org_eng on public.comparatives_checks(org_id, engagement_id);

create trigger set_comparatives_checks_updated_at
  before update on public.comparatives_checks
  for each row execute function public.handle_updated_at();

alter table public.comparatives_checks enable row level security;

create policy if not exists comparatives_checks_select on public.comparatives_checks
  for select using (app.is_org_member(org_id, 'staff'));

create policy if not exists comparatives_checks_insert on public.comparatives_checks
  for insert with check (app.is_org_member(org_id, 'staff'));

create policy if not exists comparatives_checks_update on public.comparatives_checks
  for update using (app.is_org_member(org_id, 'staff'))
  with check (app.is_org_member(org_id, 'staff'));

create policy if not exists comparatives_checks_delete on public.comparatives_checks
  for delete using (app.is_org_member(org_id, 'manager'));
