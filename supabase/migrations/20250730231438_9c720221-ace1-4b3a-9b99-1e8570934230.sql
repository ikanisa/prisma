-- ======================================================================
-- BASELINE MIGRATION: Create core agent tables
-- ======================================================================

-- Drop and recreate contacts to match the new schema
DROP TABLE IF EXISTS contacts CASCADE;
CREATE TABLE contacts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wa_id           text UNIQUE,                -- WhatsApp phone
    display_name    text,
    language        text DEFAULT 'en',
    created_at      timestamptz DEFAULT now()
);

-- Create conversations table with proper foreign key
CREATE TABLE conversations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id      uuid REFERENCES contacts(id) ON DELETE CASCADE,
    channel         text DEFAULT 'whatsapp',
    started_at      timestamptz DEFAULT now(),
    last_message_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_conv_contact ON conversations(contact_id);

-- Create bridge_conversations table
CREATE TABLE bridge_conversations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
    human_id        uuid,
    status          text DEFAULT 'open',
    opened_at       timestamptz DEFAULT now(),
    closed_at       timestamptz
);

-- Update agent_document_embeddings
ALTER TABLE agent_document_embeddings ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE agent_document_embeddings ADD COLUMN IF NOT EXISTS lang text DEFAULT 'en';

-- Recreate agent_memory with proper foreign key
DROP TABLE IF EXISTS agent_memory CASCADE;
CREATE TABLE agent_memory (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id   uuid REFERENCES contacts(id) ON DELETE CASCADE,
    memory_type  text,              -- turn | summary | pref
    content      text,
    created_at   timestamptz DEFAULT now()
);

-- Recreate agent_memory_enhanced with proper foreign key
DROP TABLE IF EXISTS agent_memory_enhanced CASCADE;
CREATE TABLE agent_memory_enhanced (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id   uuid REFERENCES contacts(id) ON DELETE CASCADE,
    embedding_id text,
    vector       vector(1536),
    metadata     jsonb,
    created_at   timestamptz DEFAULT now()
);

-- Ensure agent_skills has the right structure
ALTER TABLE agent_skills ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE agent_skills ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE agent_skills ADD COLUMN IF NOT EXISTS signature jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS agent_skills_name_unique ON agent_skills(name) WHERE name IS NOT NULL;

-- Recreate agent_tool_calls with proper foreign keys
DROP TABLE IF EXISTS agent_tool_calls CASCADE;
CREATE TABLE agent_tool_calls (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
    skill_id        uuid REFERENCES agent_skills(id),
    input_params    jsonb,
    output_payload  jsonb,
    latency_ms      int,
    created_at      timestamptz DEFAULT now()
);

-- Recreate automated_tasks with proper foreign key
DROP TABLE IF EXISTS automated_tasks CASCADE;
CREATE TABLE automated_tasks (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id   uuid REFERENCES contacts(id) ON DELETE CASCADE,
    title        text,
    schedule     text,
    next_run     timestamptz,
    is_enabled   boolean DEFAULT true,
    created_at   timestamptz DEFAULT now()
);

-- Recreate agent_tasks with proper foreign key
DROP TABLE IF EXISTS agent_tasks CASCADE;
CREATE TABLE agent_tasks (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id      uuid REFERENCES automated_tasks(id) ON DELETE CASCADE,
    run_at       timestamptz DEFAULT now(),
    status       text DEFAULT 'queued',
    output       jsonb
);

-- Create model registry
CREATE TABLE IF NOT EXISTS mcp_model_registry (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name   text,
    version      text,
    meta         jsonb,
    registered_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_model_registry ENABLE ROW LEVEL SECURITY;

-- Create system policies
CREATE POLICY "System can manage contacts" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage bridge_conversations" ON bridge_conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage agent_memory" ON agent_memory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage agent_memory_enhanced" ON agent_memory_enhanced FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage agent_tool_calls" ON agent_tool_calls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage automated_tasks" ON automated_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage agent_tasks" ON agent_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage mcp_model_registry" ON mcp_model_registry FOR ALL USING (true) WITH CHECK (true);

-- Insert starter rows
INSERT INTO mcp_model_registry (model_name, version, meta)
VALUES ('gpt-4o', '2025-07-12', '{}');

-- Insert basic agent skills
INSERT INTO agent_skills (name, description, signature) 
VALUES
 ('payment_qr_generate', 'Generate MoMo QR', '{"amount":"int","momo_number":"string"}'),
 ('driver_trip_create', 'Create driver trip', '{"pickup":"string","dropoff":"string"}')
ON CONFLICT (name) DO NOTHING;