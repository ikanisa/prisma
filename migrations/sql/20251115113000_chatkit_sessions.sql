set check_function_bodies = off;

create table if not exists public.chatkit_sessions (
  id uuid primary key default gen_random_uuid(),
  agent_session_id uuid not null references public.agent_sessions(id) on delete cascade,
  chatkit_session_id text not null,
  status text not null default 'ACTIVE',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_chatkit_session_id on public.chatkit_sessions(chatkit_session_id);
create unique index if not exists uq_chatkit_session_agent on public.chatkit_sessions(agent_session_id);
create index if not exists idx_chatkit_session_status on public.chatkit_sessions(status);

alter table public.chatkit_sessions enable row level security;
create policy chatkit_sessions_select on public.chatkit_sessions
  for select using (public.is_member_of((select org_id from public.agent_sessions where id = agent_session_id)));
create policy chatkit_sessions_write on public.chatkit_sessions
  for all using (public.has_min_role((select org_id from public.agent_sessions where id = agent_session_id), 'EMPLOYEE'::public.role_level))
  with check (public.has_min_role((select org_id from public.agent_sessions where id = agent_session_id), 'EMPLOYEE'::public.role_level));

create trigger trg_chatkit_sessions_touch
  before update on public.chatkit_sessions
  for each row execute function app.touch_updated_at();
