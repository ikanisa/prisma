-- =======================================================================
-- Core contact & conversation tables
-- =======================================================================
CREATE TABLE IF NOT EXISTS contacts_new (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wa_id            text UNIQUE,           -- WhatsApp number
    display_name     text,
    language         text DEFAULT 'en',
    created_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contacts_new_wa_id ON contacts_new(wa_id);

CREATE TABLE IF NOT EXISTS conversations (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id       uuid REFERENCES contacts_new(id),
    channel          text DEFAULT 'whatsapp',
    started_at       timestamptz DEFAULT now(),
    last_message_at  timestamptz
);
CREATE INDEX IF NOT EXISTS idx_conv_contact_id ON conversations(contact_id);

CREATE TABLE IF NOT EXISTS bridge_conversations_new (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id  uuid REFERENCES conversations(id),
    human_id         uuid,          -- operator
    status           text DEFAULT 'open',  -- open | closed
    opened_at        timestamptz DEFAULT now(),
    closed_at        timestamptz
);

-- =======================================================================
-- Agent memory & learning
-- =======================================================================
CREATE TABLE IF NOT EXISTS agent_memory_new (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id       uuid REFERENCES contacts_new(id),
    memory_type      text,              -- summary | preference
    content          text,
    created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_memory_enhanced_new (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id       uuid REFERENCES contacts_new(id),
    embedding_id     text,              -- pinecone id
    vector           vector(1536),      -- optional pgvector mirror
    metadata         jsonb,
    created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_consolidation_log (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id       uuid,
    consolidated_at  timestamptz DEFAULT now(),
    summary_token_len int,
    new_memories      int
);

-- =======================================================================
-- Learning documents & embeddings
-- =======================================================================
CREATE TABLE IF NOT EXISTS agent_document_embeddings_new (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type      text,
    source_ref       text,
    chunk_index      int,
    content          text,
    vector_id        text,
    created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_learning_new (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name         text,
    status           text,              -- pending | running | done | error
    run_at           timestamptz DEFAULT now(),
    details          jsonb
);

-- =======================================================================
-- Skills & tool calls
-- =======================================================================
CREATE TABLE IF NOT EXISTS agent_skills_new (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name             text UNIQUE,
    description      text,
    signature        jsonb,
    created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_tool_calls_new (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id  uuid REFERENCES conversations(id),
    skill_id         uuid REFERENCES agent_skills_new(id),
    input_params     jsonb,
    output_payload   jsonb,
    latency_ms       int,
    created_at       timestamptz DEFAULT now()
);

-- =======================================================================
-- Tasks (cron & conditional)
-- =======================================================================
CREATE TABLE IF NOT EXISTS automated_tasks_new (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id       uuid REFERENCES contacts_new(id),
    title            text,
    schedule         text,          -- iCal VEVENT
    next_run         timestamptz,
    is_enabled       boolean DEFAULT true,
    created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_tasks_new (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id          uuid REFERENCES automated_tasks_new(id),
    run_at           timestamptz DEFAULT now(),
    status           text DEFAULT 'queued',   -- queued | running | done | error
    output           jsonb
);

-- =======================================================================
-- Model registry
-- =======================================================================
CREATE TABLE IF NOT EXISTS mcp_model_registry (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name       text,
    version          text,
    meta             jsonb,
    registered_at    timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE contacts_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_conversations_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_enhanced_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_consolidation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_document_embeddings_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_learning_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_skills_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tool_calls_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_tasks_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_model_registry ENABLE ROW LEVEL SECURITY;

-- Create system policies for all tables
CREATE POLICY "System can manage contacts_new" ON contacts_new FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage bridge_conversations_new" ON bridge_conversations_new FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage agent_memory_new" ON agent_memory_new FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage agent_memory_enhanced_new" ON agent_memory_enhanced_new FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage memory_consolidation_log" ON memory_consolidation_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage agent_document_embeddings_new" ON agent_document_embeddings_new FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage agent_learning_new" ON agent_learning_new FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage agent_skills_new" ON agent_skills_new FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage agent_tool_calls_new" ON agent_tool_calls_new FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage automated_tasks_new" ON automated_tasks_new FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage agent_tasks_new" ON agent_tasks_new FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage mcp_model_registry" ON mcp_model_registry FOR ALL USING (true) WITH CHECK (true);

-- Drop existing tables and rename new ones
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS bridge_conversations CASCADE;
DROP TABLE IF EXISTS agent_memory CASCADE;
DROP TABLE IF EXISTS agent_memory_enhanced CASCADE;
DROP TABLE IF EXISTS agent_document_embeddings CASCADE;
DROP TABLE IF EXISTS agent_learning CASCADE;
DROP TABLE IF EXISTS agent_skills CASCADE;
DROP TABLE IF EXISTS agent_tool_calls CASCADE;
DROP TABLE IF EXISTS automated_tasks CASCADE;
DROP TABLE IF EXISTS agent_tasks CASCADE;

ALTER TABLE contacts_new RENAME TO contacts;
ALTER TABLE bridge_conversations_new RENAME TO bridge_conversations;
ALTER TABLE agent_memory_new RENAME TO agent_memory;
ALTER TABLE agent_memory_enhanced_new RENAME TO agent_memory_enhanced;
ALTER TABLE agent_document_embeddings_new RENAME TO agent_document_embeddings;
ALTER TABLE agent_learning_new RENAME TO agent_learning;
ALTER TABLE agent_skills_new RENAME TO agent_skills;
ALTER TABLE agent_tool_calls_new RENAME TO agent_tool_calls;
ALTER TABLE automated_tasks_new RENAME TO automated_tasks;
ALTER TABLE agent_tasks_new RENAME TO agent_tasks;

-- Starter rows so tables are non-empty
INSERT INTO mcp_model_registry (model_name, version, meta)
VALUES ('gpt-4o', '2025-07-12', '{"temperature":0.2}')
ON CONFLICT DO NOTHING;

INSERT INTO agent_skills (name, description, signature)
VALUES
 ('payment_qr_generate', 'Generate MoMo QR', '{"amount":"int","momo_number":"string"}'),
 ('driver_trip_create', 'Create driver trip', '{"pickup":"string","dropoff":"string"}')
ON CONFLICT DO NOTHING;