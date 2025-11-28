-- Phase 4 Document AI pipeline support

alter table if exists public.document_extractions
  add column if not exists document_type text;

create table if not exists public.document_quarantine (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  extraction_id uuid references public.document_extractions(id) on delete set null,
  reason text,
  status text not null default 'PENDING' check (status in ('PENDING','REVIEWED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists document_quarantine_org_status_idx
  on public.document_quarantine (org_id, status, created_at desc);

create index if not exists document_quarantine_document_idx
  on public.document_quarantine (document_id, created_at desc);

alter table public.document_quarantine enable row level security;

drop policy if exists document_quarantine_select on public.document_quarantine;
create policy document_quarantine_select on public.document_quarantine
  for select using (
    public.is_member_of(org_id) and public.has_min_role(org_id, 'MANAGER')
  );

drop policy if exists document_quarantine_insert on public.document_quarantine;
create policy document_quarantine_insert on public.document_quarantine
  for insert with check (
    public.is_member_of(org_id)
  );

drop policy if exists document_quarantine_update on public.document_quarantine;
create policy document_quarantine_update on public.document_quarantine
  for update using (
    public.is_member_of(org_id) and public.has_min_role(org_id, 'MANAGER')
  );

drop trigger if exists set_document_quarantine_updated_at on public.document_quarantine;
create trigger set_document_quarantine_updated_at
  before update on public.document_quarantine
  for each row execute function public.set_updated_at();
