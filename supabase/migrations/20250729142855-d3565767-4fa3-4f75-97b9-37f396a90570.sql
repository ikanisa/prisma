-- Multi-Tier Memory & Context Model - Phase 1: Core Tables
-- Create user profiles table for persistent user data
create table if not exists user_profiles (
  user_id uuid primary key,
  language text default 'en',
  default_wallet text,
  name text,
  preferences jsonb default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS for user profiles
alter table user_profiles enable row level security;

-- Create policy for users to manage their own profiles
create policy "Users can manage their own profile"
on user_profiles
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Admin can view all profiles
create policy "Admin can view all profiles"
on user_profiles
for select
using (is_admin());

-- Create conversation summaries table for short-term memory
create table if not exists conversation_summaries (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  summary text not null,
  start_ts timestamp with time zone not null,
  end_ts timestamp with time zone not null,
  message_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS for conversation summaries
alter table conversation_summaries enable row level security;

-- Create policy for users to access their own summaries
create policy "Users can access their own summaries"
on conversation_summaries
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Admin can view all summaries
create policy "Admin can view all summaries"
on conversation_summaries
for select
using (is_admin());

-- Create memory cache table for ephemeral chat storage
create table if not exists memory_cache (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  session_id text not null,
  data jsonb not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS for memory cache
alter table memory_cache enable row level security;

-- Create policy for memory cache access
create policy "Users can access their own memory cache"
on memory_cache
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- System can manage memory cache
create policy "System can manage memory cache"
on memory_cache
for all
using (true)
with check (true);

-- Create intent classifications table for learning
create table if not exists intent_classifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  message_text text not null,
  classified_intent text not null,
  confidence_score numeric not null,
  correct_classification boolean,
  feedback_received_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Enable RLS for intent classifications
alter table intent_classifications enable row level security;

-- Create policy for intent classifications
create policy "System can manage intent classifications"
on intent_classifications
for all
using (true)
with check (true);

-- Admin can view all intent classifications
create policy "Admin can view intent classifications"
on intent_classifications
for select
using (is_admin());

-- Create indexes for performance
create index if not exists idx_conversation_summaries_user_id_end_ts 
on conversation_summaries(user_id, end_ts desc);

create index if not exists idx_memory_cache_user_session 
on memory_cache(user_id, session_id);

create index if not exists idx_memory_cache_expires 
on memory_cache(expires_at);

create index if not exists idx_intent_classifications_user_created 
on intent_classifications(user_id, created_at desc);

-- Create function to clean expired memory cache
create or replace function clean_expired_memory_cache()
returns void
language plpgsql
security definer
as $$
begin
  delete from memory_cache where expires_at < now();
end;
$$;

-- Create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create triggers for updated_at
create trigger update_user_profiles_updated_at
  before update on user_profiles
  for each row
  execute function update_updated_at_column();

create trigger update_conversation_summaries_updated_at
  before update on conversation_summaries
  for each row
  execute function update_updated_at_column();