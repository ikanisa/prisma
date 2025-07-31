-- ======================================================================
-- Phase 1: Database Schema Alignment - Final Clean Version
-- ======================================================================

-- Add missing columns to existing tables
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
    
    -- agent_memory: rename user_id to contact_id for consistency
    if not exists (select 1 from information_schema.columns where table_name = 'agent_memory' and column_name = 'contact_id') then
        if exists (select 1 from information_schema.columns where table_name = 'agent_memory' and column_name = 'user_id') then
            alter table agent_memory rename column user_id to contact_id;
            alter table agent_memory rename column memory_value to content;
        end if;
    end if;
    
    -- automated_tasks: add missing columns for proper task scheduling
    if exists (select 1 from information_schema.columns where table_name = 'automated_tasks' and column_name = 'task_name') then
        alter table automated_tasks rename column task_name to title;
        if not exists (select 1 from information_schema.columns where table_name = 'automated_tasks' and column_name = 'schedule') then
            alter table automated_tasks add column schedule text;
        end if;
        if not exists (select 1 from information_schema.columns where table_name = 'automated_tasks' and column_name = 'next_run') then
            alter table automated_tasks add column next_run timestamptz;
        end if;
        if not exists (select 1 from information_schema.columns where table_name = 'automated_tasks' and column_name = 'is_enabled') then
            alter table automated_tasks add column is_enabled boolean default true;
        end if;
        if not exists (select 1 from information_schema.columns where table_name = 'automated_tasks' and column_name = 'contact_id') then
            alter table automated_tasks add column contact_id uuid references contacts(id) on delete cascade;
        end if;
    end if;
    
    -- memory_consolidation_log: add missing columns
    if exists (select 1 from information_schema.columns where table_name = 'memory_consolidation_log' and column_name = 'summary_text') then
        if not exists (select 1 from information_schema.columns where table_name = 'memory_consolidation_log' and column_name = 'summary_token_len') then
            alter table memory_consolidation_log add column summary_token_len int;
        end if;
        if not exists (select 1 from information_schema.columns where table_name = 'memory_consolidation_log' and column_name = 'new_memories') then
            alter table memory_consolidation_log add column new_memories int;
        end if;
        if not exists (select 1 from information_schema.columns where table_name = 'memory_consolidation_log' and column_name = 'contact_id') then
            if exists (select 1 from information_schema.columns where table_name = 'memory_consolidation_log' and column_name = 'user_id') then
                alter table memory_consolidation_log rename column user_id to contact_id;
            else
                alter table memory_consolidation_log add column contact_id uuid references contacts(id) on delete cascade;
            end if;
        end if;
    end if;
    
    -- mcp_model_registry: add missing columns for model specification
    if exists (select 1 from information_schema.columns where table_name = 'mcp_model_registry' and column_name = 'primary_model') then
        if not exists (select 1 from information_schema.columns where table_name = 'mcp_model_registry' and column_name = 'model_name') then
            alter table mcp_model_registry add column model_name text;
        end if;
        if not exists (select 1 from information_schema.columns where table_name = 'mcp_model_registry' and column_name = 'version') then
            alter table mcp_model_registry add column version text;
        end if;
        if not exists (select 1 from information_schema.columns where table_name = 'mcp_model_registry' and column_name = 'meta') then
            alter table mcp_model_registry add column meta jsonb default '{}';
        end if;
        if not exists (select 1 from information_schema.columns where table_name = 'mcp_model_registry' and column_name = 'registered_at') then
            alter table mcp_model_registry add column registered_at timestamptz default now();
        end if;
    end if;
    
end $$;

-- Create indexes for performance
create index if not exists idx_agent_memory_contact on agent_memory(contact_id);
create index if not exists idx_automated_tasks_contact on automated_tasks(contact_id);
create index if not exists idx_automated_tasks_next_run on automated_tasks(next_run) where is_enabled = true;
create index if not exists idx_memory_consolidation_contact on memory_consolidation_log(contact_id);
create index if not exists idx_agent_document_embeddings_domain on agent_document_embeddings(domain);
create index if not exists idx_agent_document_embeddings_lang on agent_document_embeddings(lang);

-- Update some initial data in mcp_model_registry
update mcp_model_registry set 
    model_name = 'gpt-4o',
    version = '2025-07-12',
    meta = '{"temperature": 0.2, "max_tokens": 4000}'
where primary_model = 'gpt-4o' and model_name is null;

-- Seed agent skills
insert into agent_skills (name, description, signature)
values
    ('payment_qr_generate', 'Generate MoMo QR code + USSD fallback', '{"amount": "integer", "momo_number": "string", "label": "string"}'),
    ('driver_trip_create', 'Create driver trip (pickup, drop-off, time)', '{"pickup": "string", "dropoff": "string", "time": "string"}'),
    ('quality_gate', 'Score and patch outgoing response', '{"response": "string"}'),
    ('create_task', 'Create automated reminder for user', '{"title": "string", "prompt": "string", "schedule": "string"}')
on conflict (name) do nothing;