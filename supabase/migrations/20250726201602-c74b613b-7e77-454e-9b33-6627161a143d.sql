-- 1. Messages table
create table if not exists whatsapp_messages (
  id            uuid primary key default gen_random_uuid(),
  wa_message_id text,                -- WhatsApp message id
  from_number   text not null,
  to_number     text not null,
  direction     text check (direction in ('in','out')) not null,
  msg_type      text default 'text',
  body          text,
  raw_json      jsonb,
  agent_id      text,                -- which agent handled it
  status        text default 'received', -- sent, delivered, failed
  created_at    timestamptz default now()
);

-- 2. Conversations (thread)
create table if not exists whatsapp_conversations (
  id            uuid primary key default gen_random_uuid(),
  user_number   text not null,
  last_agent_id text,
  last_message_at timestamptz default now(),
  context_state jsonb default '{}'::jsonb  -- store state like intents, slots
);

-- Indexes
create index on whatsapp_messages (from_number, created_at);
create index on whatsapp_conversations (user_number);

-- RLS (only admin app needs access, but set anyway)
alter table whatsapp_messages enable row level security;
alter table whatsapp_conversations enable row level security;

create policy "admin_read_messages" on whatsapp_messages
  for select using (auth.role() = 'service_role');
create policy "admin_write_messages" on whatsapp_messages
  for insert with check (auth.role() = 'service_role');

create policy "admin_read_conversations" on whatsapp_conversations
  for select using (auth.role() = 'service_role');
create policy "admin_write_conversations" on whatsapp_conversations
  for insert with check (auth.role() = 'service_role');
create policy "admin_update_conversations" on whatsapp_conversations
  for update using (auth.role() = 'service_role');