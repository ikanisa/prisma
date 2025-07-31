-- ======================================================================
-- Phase 1: Database Schema Alignment Migration
-- Comprehensive migration to align all table schemas with specification
-- ======================================================================

-- Create missing core tables for agent system
create table if not exists automated_tasks (
    id               uuid primary key default gen_random_uuid(),
    contact_id       uuid references contacts(id) on delete cascade,
    title            text not null,
    schedule         text not null,          -- iCal VEVENT
    next_run         timestamptz,
    is_enabled       boolean default true,
    created_at       timestamptz default now()
);

create table if not exists agent_tasks (
    id               uuid primary key default gen_random_uuid(),
    task_id          uuid references automated_tasks(id) on delete cascade,
    run_at           timestamptz default now(),
    status           text default 'queued',   -- queued | running | done | error
    output           jsonb
);

-- Create memory consolidation log table
create table if not exists memory_consolidation_log (
    id                uuid primary key default gen_random_uuid(),
    contact_id        uuid references contacts(id) on delete cascade,
    consolidated_at   timestamptz default now(),
    summary_token_len int,
    new_memories      int
);

-- Create MCP model registry table
create table if not exists mcp_model_registry (
    id               uuid primary key default gen_random_uuid(),
    model_name       text not null,
    version          text not null,
    meta             jsonb default '{}',
    registered_at    timestamptz default now()
);

-- Add missing columns to existing tables if they don't exist
do $$
begin
    -- Add hash column to centralized_documents if it doesn't exist
    if not exists (select 1 from information_schema.columns where table_name = 'centralized_documents' and column_name = 'hash') then
        alter table centralized_documents add column hash text;
    end if;
    
    -- Add domain and lang columns to agent_document_embeddings if they don't exist
    if not exists (select 1 from information_schema.columns where table_name = 'agent_document_embeddings' and column_name = 'domain') then
        alter table agent_document_embeddings add column domain text;
    end if;
    
    if not exists (select 1 from information_schema.columns where table_name = 'agent_document_embeddings' and column_name = 'lang') then
        alter table agent_document_embeddings add column lang text default 'en';
    end if;
end $$;

-- Fix agent_memory table to ensure proper foreign key constraint
do $$
begin
    -- Add foreign key constraint if it doesn't exist
    if not exists (
        select 1 from information_schema.table_constraints 
        where constraint_name = 'agent_memory_contact_id_fkey' 
        and table_name = 'agent_memory'
    ) then
        alter table agent_memory 
        add constraint agent_memory_contact_id_fkey 
        foreign key (contact_id) references contacts(id) on delete cascade;
    end if;
end $$;

-- Create indexes for performance
create index if not exists idx_automated_tasks_contact on automated_tasks(contact_id);
create index if not exists idx_automated_tasks_next_run on automated_tasks(next_run) where is_enabled = true;
create index if not exists idx_agent_tasks_task_id on agent_tasks(task_id);
create index if not exists idx_agent_tasks_status on agent_tasks(status);
create index if not exists idx_memory_consolidation_contact on memory_consolidation_log(contact_id);
create index if not exists idx_mcp_model_registry_name_version on mcp_model_registry(model_name, version);

-- Seed initial data for MCP model registry
insert into mcp_model_registry (model_name, version, meta)
values 
    ('gpt-4o', '2025-07-12', '{"temperature": 0.2, "max_tokens": 4000}'),
    ('gpt-4o-mini', '2025-07-12', '{"temperature": 0.3, "max_tokens": 1000}'),
    ('text-embedding-3-large', '2025-07-12', '{"dimensions": 1536}')
on conflict do nothing;

-- Seed initial agent skills if table exists
insert into agent_skills (name, description, signature)
values
    ('payment_qr_generate', 'Generate MoMo QR code + USSD fallback', '{"amount": "integer", "momo_number": "string", "label": "string"}'),
    ('driver_trip_create', 'Create driver trip (pickup, drop-off, time)', '{"pickup": "string", "dropoff": "string", "time": "string"}'),
    ('quality_gate', 'Score and patch outgoing response', '{"response": "string"}'),
    ('create_task', 'Create automated reminder for user', '{"title": "string", "prompt": "string", "schedule": "string"}')
on conflict (name) do nothing;

-- Update RLS policies to ensure proper access control
alter table automated_tasks enable row level security;
alter table agent_tasks enable row level security;
alter table memory_consolidation_log enable row level security;
alter table mcp_model_registry enable row level security;

-- Create RLS policies for new tables
create policy "System can manage automated tasks" on automated_tasks for all using (true);
create policy "System can manage agent tasks" on agent_tasks for all using (true);
create policy "System can manage memory consolidation log" on memory_consolidation_log for all using (true);
create policy "System can read model registry" on mcp_model_registry for select using (true);

-- Create helpful views for monitoring
create or replace view agent_task_summary as
select 
    t.title,
    t.schedule,
    t.next_run,
    t.is_enabled,
    count(at.id) as total_runs,
    count(at.id) filter (where at.status = 'done') as successful_runs,
    max(at.run_at) as last_run
from automated_tasks t
left join agent_tasks at on t.id = at.task_id
group by t.id, t.title, t.schedule, t.next_run, t.is_enabled;

create or replace view memory_consolidation_summary as
select 
    c.wa_id,
    c.display_name,
    count(mcl.id) as consolidation_count,
    max(mcl.consolidated_at) as last_consolidation,
    sum(mcl.new_memories) as total_memories_processed
from contacts c
left join memory_consolidation_log mcl on c.id = mcl.contact_id
group by c.id, c.wa_id, c.display_name;