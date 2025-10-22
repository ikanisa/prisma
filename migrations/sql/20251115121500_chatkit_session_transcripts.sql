set check_function_bodies = off;

create table if not exists public.chatkit_session_transcripts (
  id uuid primary key default gen_random_uuid(),
  chatkit_session_id text not null references public.chatkit_sessions(chatkit_session_id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  transcript text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_chatkit_session_transcripts_session
  on public.chatkit_session_transcripts(chatkit_session_id, created_at desc);

alter table public.chatkit_session_transcripts enable row level security;

create policy chatkit_session_transcripts_select on public.chatkit_session_transcripts
  for select using (
    public.is_member_of(
      (
        select a.org_id
        from public.chatkit_sessions s
        join public.agent_sessions a on a.id = s.agent_session_id
        where s.chatkit_session_id = chatkit_session_transcripts.chatkit_session_id
        limit 1
      )
    )
  );

create policy chatkit_session_transcripts_write on public.chatkit_session_transcripts
  for all using (
    public.has_min_role(
      (
        select a.org_id
        from public.chatkit_sessions s
        join public.agent_sessions a on a.id = s.agent_session_id
        where s.chatkit_session_id = chatkit_session_transcripts.chatkit_session_id
        limit 1
      ),
      'EMPLOYEE'::public.role_level
    )
  )
  with check (
    public.has_min_role(
      (
        select a.org_id
        from public.chatkit_sessions s
        join public.agent_sessions a on a.id = s.agent_session_id
        where s.chatkit_session_id = chatkit_session_transcripts.chatkit_session_id
        limit 1
      ),
      'EMPLOYEE'::public.role_level
    )
  );
