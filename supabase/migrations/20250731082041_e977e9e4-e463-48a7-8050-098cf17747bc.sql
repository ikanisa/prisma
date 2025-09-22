-- ======================================================================
-- Phase 1: Database Schema Alignment Migration (Final)
-- Add missing columns and fix existing table schemas
-- ======================================================================

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
    
    -- Add contact_id to agent_memory if it doesn't exist (check if user_id exists instead)
    if not exists (select 1 from information_schema.columns where table_name = 'agent_memory' and column_name = 'contact_id') then
        if exists (select 1 from information_schema.columns where table_name = 'agent_memory' and column_name = 'user_id') then
            -- Rename user_id to contact_id for consistency
            alter table agent_memory rename column user_id to contact_id;
        else
            -- Add contact_id column
            alter table agent_memory add column contact_id uuid references contacts(id) on delete cascade;
        end if;
    end if;
    
    -- Ensure automated_tasks has contact_id properly linked
    if not exists (select 1 from information_schema.table_constraints 
                   where constraint_name like '%automated_tasks_contact_id_fkey%' 
                   and table_name = 'automated_tasks') then
        if exists (select 1 from information_schema.columns where table_name = 'automated_tasks' and column_name = 'contact_id') then
            alter table automated_tasks add constraint automated_tasks_contact_id_fkey 
            foreign key (contact_id) references contacts(id) on delete cascade;
        end if;
    end if;
    
    -- Ensure agent_tasks has task_id properly linked
    if not exists (select 1 from information_schema.table_constraints 
                   where constraint_name like '%agent_tasks_task_id_fkey%' 
                   and table_name = 'agent_tasks') then
        if exists (select 1 from information_schema.columns where table_name = 'agent_tasks' and column_name = 'task_id') then
            alter table agent_tasks add constraint agent_tasks_task_id_fkey 
            foreign key (task_id) references automated_tasks(id) on delete cascade;
        end if;
    end if;
    
    -- Ensure memory_consolidation_log has contact_id properly linked
    if not exists (select 1 from information_schema.table_constraints 
                   where constraint_name like '%memory_consolidation_log_contact_id_fkey%' 
                   and table_name = 'memory_consolidation_log') then
        if exists (select 1 from information_schema.columns where table_name = 'memory_consolidation_log' and column_name = 'contact_id') then
            alter table memory_consolidation_log add constraint memory_consolidation_log_contact_id_fkey 
            foreign key (contact_id) references contacts(id) on delete cascade;
        end if;
    end if;
    
end $$;

-- Create indexes for performance
create index if not exists idx_agent_memory_contact on agent_memory(contact_id);
create index if not exists idx_automated_tasks_contact on automated_tasks(contact_id);
create index if not exists idx_automated_tasks_next_run on automated_tasks(next_run) where is_enabled = true;
create index if not exists idx_agent_tasks_task_id on agent_tasks(task_id);
create index if not exists idx_agent_tasks_status on agent_tasks(status);
create index if not exists idx_memory_consolidation_contact on memory_consolidation_log(contact_id);
create index if not exists idx_mcp_model_registry_name_version on mcp_model_registry(model_name, version);
create index if not exists idx_agent_document_embeddings_domain on agent_document_embeddings(domain);
create index if not exists idx_agent_document_embeddings_lang on agent_document_embeddings(lang);

-- Seed initial data for MCP model registry
insert into mcp_model_registry (model_name, version, meta)
values 
    ('gpt-4o', '2025-07-12', '{"temperature": 0.2, "max_tokens": 4000}'),
    ('gpt-4o-mini', '2025-07-12', '{"temperature": 0.3, "max_tokens": 1000}'),
    ('text-embedding-3-large', '2025-07-12', '{"dimensions": 1536}')
on conflict (model_name, version) do nothing;

-- Seed initial agent skills
insert into agent_skills (name, description, signature)
values
    ('payment_qr_generate', 'Generate MoMo QR code + USSD fallback', '{"amount": "integer", "momo_number": "string", "label": "string"}'),
    ('driver_trip_create', 'Create driver trip (pickup, drop-off, time)', '{"pickup": "string", "dropoff": "string", "time": "string"}'),
    ('quality_gate', 'Score and patch outgoing response', '{"response": "string"}'),
    ('create_task', 'Create automated reminder for user', '{"title": "string", "prompt": "string", "schedule": "string"}')
on conflict (name) do nothing;

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