-- ============================================================
--  AI AGENTS CORE TABLE
-- ============================================================
create table public.agents (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  status      text default 'active',          -- active / paused
  description text,
  created_at  timestamp default now()
);

-- ============================================================
--  AGENT PERSONAS
-- ============================================================
create table public.agent_personas (
  id           uuid primary key default gen_random_uuid(),
  agent_id     uuid references public.agents(id) on delete cascade,
  language     text default 'en',
  tone         text,
  personality  text,          -- e.g., "friendly", "concise"
  instructions text,          -- system prompt addons
  updated_at   timestamp default now()
);

-- ============================================================
--  AGENT TASKS / TOOLS
-- ============================================================
create table public.agent_tasks (
  id              uuid primary key default gen_random_uuid(),
  agent_id        uuid references public.agents(id) on delete cascade,
  name            text,
  trigger_type    text,      -- regex, keyword, cron, api
  trigger_value   text,
  tool_name       text,      -- edge‑function or db op
  tool_input_json jsonb,
  active          boolean default true,
  created_at      timestamp default now()
);

-- ============================================================
--  LEARNING CONFIGS
-- ============================================================
create table public.agent_learning (
  id            uuid primary key default gen_random_uuid(),
  agent_id      uuid references public.agents(id) on delete cascade,
  source_type   text,       -- 'bucket','url','supabase_table'
  source_detail text,
  vectorize     boolean default true,
  created_at    timestamp default now()
);

-- ============================================================
--  AGENT DOCUMENTS  (upload & RAG)
-- ============================================================
create table public.agent_documents (
  id            uuid primary key default gen_random_uuid(),
  agent_id      uuid references public.agents(id) on delete cascade,
  title         text,
  storage_path  text,        -- e.g. storage://uploads/docs/xyz.pdf
  embedding_ok  boolean default false,
  created_at    timestamp default now()
);

-- ============================================================
--  AGENT EXECUTION LOGS  (optional)
-- ============================================================
create table public.agent_logs (
  id         uuid primary key default gen_random_uuid(),
  agent_id   uuid references public.agents(id) on delete cascade,
  user_id    uuid,
  event      text,          -- trigger name
  success    boolean,
  created_at timestamp default now()
);

-- ============================================================
--  ROW LEVEL SECURITY  (admin‑only; others = read‑only or none)
-- ============================================================
alter table public.agents            enable row level security;
alter table public.agent_personas    enable row level security;
alter table public.agent_tasks       enable row level security;
alter table public.agent_learning    enable row level security;
alter table public.agent_documents   enable row level security;
alter table public.agent_logs        enable row level security;

-- Admin role check helper (assumes auth.role is set via JWT)
create or replace function is_admin() returns boolean language sql as $$
  select (auth.jwt() ->> 'role') = 'admin';
$$;

create policy "Admin full" on public.agents
  for all using (is_admin()) with check (is_admin());
create policy "Admin full" on public.agent_personas
  for all using (is_admin()) with check (is_admin());
create policy "Admin full" on public.agent_tasks
  for all using (is_admin()) with check (is_admin());
create policy "Admin full" on public.agent_learning
  for all using (is_admin()) with check (is_admin());
create policy "Admin full" on public.agent_documents
  for all using (is_admin()) with check (is_admin());
create policy "Admin read" on public.agent_logs
  for select using (is_admin());

-- Create storage bucket for agent documents
insert into storage.buckets (id, name, public) values ('agent-docs', 'agent-docs', false);

-- Create storage policies for agent documents
create policy "Admin can upload agent documents" on storage.objects 
for insert with check (bucket_id = 'agent-docs' AND is_admin());

create policy "Admin can view agent documents" on storage.objects 
for select using (bucket_id = 'agent-docs' AND is_admin());

create policy "Admin can delete agent documents" on storage.objects 
for delete using (bucket_id = 'agent-docs' AND is_admin());