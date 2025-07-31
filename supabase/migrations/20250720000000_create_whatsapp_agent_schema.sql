-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists vector;

-- Users Table
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  phone_number text not null unique,
  name text,
  created_at timestamptz not null default now()
);

-- Incoming Messages
create table if not exists public.incoming_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  body text,
  timestamp timestamptz not null default now(),
  metadata jsonb
);

-- Outgoing Messages
create table if not exists public.outgoing_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  body text,
  timestamp timestamptz not null default now(),
  metadata jsonb
);

-- Agent Threads
create table if not exists public.agent_threads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  openai_thread_id text,
  assistant_id text,
  created_at timestamptz not null default now()
);

-- Agent Memories (Vector Embeddings Optional)
create table if not exists public.agent_memories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  message text,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

-- Index for vector search
create index if not exists idx_agent_memories_embedding on public.agent_memories using ivfflat (embedding vector_l2_ops) with (lists = 100);

-- Enable Row Level Security
alter table public.users enable row level security;
alter table public.agent_threads enable row level security;
alter table public.incoming_messages enable row level security;
alter table public.outgoing_messages enable row level security;
alter table public.agent_memories enable row level security;

-- Users policies: Only allow self-management
create policy "Users can insert themselves" on public.users for insert with (auth.role() = 'authenticated');
create policy "Users can select their own" on public.users for select using (auth.uid() = id);

-- Incoming messages policies
create policy "Insert incoming via webhook" on public.incoming_messages for insert with (true);
create policy "Users can select incoming messages" on public.incoming_messages for select using (user_id = auth.uid());

-- Outgoing messages policies
create policy "Users can insert outgoing messages" on public.outgoing_messages for insert with (user_id = auth.uid());
create policy "Users can select outgoing messages" on public.outgoing_messages for select using (user_id = auth.uid());

-- Agent Threads policies
create policy "Users can insert threads" on public.agent_threads for insert with (user_id = auth.uid());
create policy "Users can select threads" on public.agent_threads for select using (user_id = auth.uid());

-- Agent memories policies
create policy "Users can insert memory" on public.agent_memories for insert with (user_id = auth.uid());
create policy "Users can select memory" on public.agent_memories for select using (user_id = auth.uid());
