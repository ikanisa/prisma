-- Phase 6 workflow orchestration support

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  workflow text not null,
  status text not null default 'RUNNING' check (status in ('PENDING','RUNNING','COMPLETED','CANCELLED')),
  current_step_index integer not null default 0,
  total_steps integer not null default 0,
  trigger text,
  required_documents jsonb default '{}'::jsonb,
  approvals jsonb default '[]'::jsonb,
  outputs jsonb default '[]'::jsonb,
  triggered_by uuid references public.users(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workflow_runs_org_idx
  on public.workflow_runs (org_id, workflow, status);

create index if not exists workflow_runs_created_idx
  on public.workflow_runs (org_id, created_at desc);

alter table public.workflow_runs enable row level security;

drop policy if exists workflow_runs_select on public.workflow_runs;
create policy workflow_runs_select on public.workflow_runs
  for select using (
    public.is_member_of(org_id)
  );

drop policy if exists workflow_runs_insert on public.workflow_runs;
create policy workflow_runs_insert on public.workflow_runs
  for insert with check (
    public.is_member_of(org_id)
  );

drop policy if exists workflow_runs_update on public.workflow_runs;
create policy workflow_runs_update on public.workflow_runs
  for update using (
    public.is_member_of(org_id)
  );

create trigger set_workflow_runs_updated_at
  before update on public.workflow_runs
  for each row execute function public.set_updated_at();

create table if not exists public.workflow_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.workflow_runs(id) on delete cascade,
  step_index integer not null,
  status text not null default 'COMPLETED' check (status in ('PENDING','RUNNING','COMPLETED','FAILED')),
  actor_id uuid references public.users(id) on delete set null,
  input jsonb default '{}'::jsonb,
  output jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workflow_events_run_idx
  on public.workflow_events (run_id, step_index);

alter table public.workflow_events enable row level security;

drop policy if exists workflow_events_select on public.workflow_events;
create policy workflow_events_select on public.workflow_events
  for select using (
    public.is_member_of(org_id)
  );

drop policy if exists workflow_events_insert on public.workflow_events;
create policy workflow_events_insert on public.workflow_events
  for insert with check (
    public.is_member_of(org_id)
  );
