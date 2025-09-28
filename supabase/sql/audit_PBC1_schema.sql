-- Audit PBC1 schema: Provided by Client (ISA 300/230) request manager

create type if not exists public.pbc_request_status as enum ('REQUESTED','RECEIVED','REJECTED','OBSOLETE');

create table if not exists public.pbc_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  cycle text not null,
  item text not null,
  description text,
  due_at timestamptz,
  assignee_client_user_id uuid,
  procedure_id uuid references public.audit_planned_procedures(id) on delete set null,
  status public.pbc_request_status not null default 'REQUESTED',
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pbc_requests_org_eng on public.pbc_requests(org_id, engagement_id);
create index if not exists idx_pbc_requests_status on public.pbc_requests(org_id, status);

create trigger trg_pbc_requests_touch
  before update on public.pbc_requests
  for each row execute function app.touch_updated_at();

create table if not exists public.pbc_deliveries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  request_id uuid not null references public.pbc_requests(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  delivered_at timestamptz not null default now(),
  note text,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_pbc_deliveries_request on public.pbc_deliveries(request_id);
create index if not exists idx_pbc_deliveries_org on public.pbc_deliveries(org_id);
