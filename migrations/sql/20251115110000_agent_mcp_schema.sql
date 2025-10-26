set check_function_bodies = off;

-- MCP tool registry ----------------------------------------------------------
create table if not exists public.agent_mcp_tools (
  id uuid primary key default gen_random_uuid(),
  tool_key text,
  name text not null,
  description text,
  schema_json jsonb not null default '{}'::jsonb,
  provider text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_agent_mcp_tools_provider_key
  on public.agent_mcp_tools(provider, coalesce(tool_key, ''));

alter table public.agent_mcp_tools enable row level security;
create policy agent_mcp_tools_select on public.agent_mcp_tools
  for select using (true);
create policy agent_mcp_tools_write on public.agent_mcp_tools
  for all using (public.has_min_role(null, 'SYSTEM_ADMIN'::public.role_level))
  with check (public.has_min_role(null, 'SYSTEM_ADMIN'::public.role_level));

create trigger trg_agent_mcp_tools_touch
  before update on public.agent_mcp_tools
  for each row execute function app.touch_updated_at();

-- Agent manifests ------------------------------------------------------------
create table if not exists public.agent_manifests (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null,
  version text not null,
  persona text not null,
  prompt_template text not null,
  tool_ids uuid[] not null default '{}'::uuid[],
  default_role text not null default 'EMPLOYEE',
  safety_level text not null default 'LOW',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_agent_manifests_key_version
  on public.agent_manifests(agent_key, version);

alter table public.agent_manifests enable row level security;
create policy agent_manifests_select on public.agent_manifests
  for select using (true);
create policy agent_manifests_write on public.agent_manifests
  for all using (public.has_min_role(null, 'SYSTEM_ADMIN'::public.role_level))
  with check (public.has_min_role(null, 'SYSTEM_ADMIN'::public.role_level));

create trigger trg_agent_manifests_touch
  before update on public.agent_manifests
  for each row execute function app.touch_updated_at();

-- Orchestration sessions -----------------------------------------------------
create type public.agent_orchestration_status as enum ('PENDING', 'RUNNING', 'WAITING_APPROVAL', 'COMPLETED', 'FAILED');

create table if not exists public.agent_orchestration_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by_user_id uuid references auth.users(id) on delete set null,
  status public.agent_orchestration_status not null default 'PENDING',
  objective text not null,
  director_agent_id uuid references public.agent_manifests(id) on delete set null,
  safety_agent_id uuid references public.agent_manifests(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_orch_sessions_org
  on public.agent_orchestration_sessions(org_id, created_at desc);

alter table public.agent_orchestration_sessions enable row level security;
create policy agent_orch_sessions_select on public.agent_orchestration_sessions
  for select using (public.is_member_of(org_id));
create policy agent_orch_sessions_write on public.agent_orchestration_sessions
  for all using (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level))
  with check (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));

create trigger trg_agent_orch_sessions_touch
  before update on public.agent_orchestration_sessions
  for each row execute function app.touch_updated_at();

-- Orchestration tasks --------------------------------------------------------
create type public.agent_task_status as enum ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'COMPLETED', 'FAILED');

create table if not exists public.agent_orchestration_tasks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.agent_orchestration_sessions(id) on delete cascade,
  agent_manifest_id uuid references public.agent_manifests(id) on delete set null,
  title text not null,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  status public.agent_task_status not null default 'PENDING',
  depends_on uuid[] not null default '{}'::uuid[],
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_orch_tasks_session_status
  on public.agent_orchestration_tasks(session_id, status);

alter table public.agent_orchestration_tasks enable row level security;
create policy agent_orch_tasks_select on public.agent_orchestration_tasks
  for select using (public.is_member_of((select org_id from public.agent_orchestration_sessions where id = session_id)));
create policy agent_orch_tasks_write on public.agent_orchestration_tasks
  for all using (public.has_min_role((select org_id from public.agent_orchestration_sessions where id = session_id), 'EMPLOYEE'::public.role_level))
  with check (public.has_min_role((select org_id from public.agent_orchestration_sessions where id = session_id), 'EMPLOYEE'::public.role_level));

create trigger trg_agent_orch_tasks_touch
  before update on public.agent_orchestration_tasks
  for each row execute function app.touch_updated_at();

-- Safety events --------------------------------------------------------------
create table if not exists public.agent_safety_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.agent_orchestration_sessions(id) on delete cascade,
  task_id uuid references public.agent_orchestration_tasks(id) on delete cascade,
  severity text not null,
  rule_code text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_safety_events_session
  on public.agent_safety_events(session_id, created_at desc);

alter table public.agent_safety_events enable row level security;
create policy agent_safety_events_select on public.agent_safety_events
  for select using (public.is_member_of((select org_id from public.agent_orchestration_sessions where id = session_id)));
create policy agent_safety_events_insert on public.agent_safety_events
  for insert with check (public.has_min_role((select org_id from public.agent_orchestration_sessions where id = session_id), 'EMPLOYEE'::public.role_level));

