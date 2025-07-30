-- ======================================================================
-- CONTACTS  •  CONVERSATIONS  •  BRIDGE (human hand-off)
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

-- Drop and recreate conversations with proper foreign key
DROP TABLE IF EXISTS conversations CASCADE;
CREATE TABLE conversations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id      uuid REFERENCES contacts(id) ON DELETE CASCADE,
    channel         text DEFAULT 'whatsapp',
    started_at      timestamptz DEFAULT now(),
    last_message_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_conv_contact ON conversations(contact_id);

-- Drop and recreate bridge_conversations
DROP TABLE IF EXISTS bridge_conversations CASCADE;
CREATE TABLE bridge_conversations (  -- human hand-off
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
    human_id        uuid,
    status          text DEFAULT 'open',
    opened_at       timestamptz DEFAULT now(),
    closed_at       timestamptz
);

-- ======================================================================
--  ACTION BUTTON CATALOG   (136 rows seeded separately)
-- ======================================================================
-- Keep existing action_buttons table structure

-- ======================================================================
--  LEARNING / MEMORY / VECTORS
-- ======================================================================
-- Update agent_document_embeddings to match new schema
ALTER TABLE agent_document_embeddings ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE agent_document_embeddings ADD COLUMN IF NOT EXISTS lang text DEFAULT 'en';

-- Drop and recreate agent_memory with proper foreign key
DROP TABLE IF EXISTS agent_memory CASCADE;
CREATE TABLE agent_memory (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id   uuid REFERENCES contacts(id) ON DELETE CASCADE,
    memory_type  text,              -- turn | summary | pref
    content      text,
    created_at   timestamptz DEFAULT now()
);

-- Drop and recreate agent_memory_enhanced with proper foreign key
DROP TABLE IF EXISTS agent_memory_enhanced CASCADE;
CREATE TABLE agent_memory_enhanced (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id   uuid REFERENCES contacts(id) ON DELETE CASCADE,
    embedding_id text,
    vector       vector(1536),
    metadata     jsonb,
    created_at   timestamptz DEFAULT now()
);

-- Keep existing memory_consolidation_log

-- ======================================================================
--  SKILLS  •  TOOL CALLS  •  MODEL REGISTRY
-- ======================================================================
-- Keep existing agent_skills table

-- Drop and recreate agent_tool_calls with proper foreign keys
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

-- Keep existing mcp_model_registry

-- ======================================================================
--  TASKS  (cron / conditional reminders)
-- ======================================================================
-- Drop and recreate automated_tasks with proper foreign key
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

-- Drop and recreate agent_tasks with proper foreign key
DROP TABLE IF EXISTS agent_tasks CASCADE;
CREATE TABLE agent_tasks (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id      uuid REFERENCES automated_tasks(id) ON DELETE CASCADE,
    run_at       timestamptz DEFAULT now(),
    status       text DEFAULT 'queued',
    output       jsonb
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

-- Create system policies
CREATE POLICY "System can manage contacts" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage bridge_conversations" ON bridge_conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage agent_memory" ON agent_memory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage agent_memory_enhanced" ON agent_memory_enhanced FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage agent_tool_calls" ON agent_tool_calls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage automated_tasks" ON automated_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage agent_tasks" ON agent_tasks FOR ALL USING (true) WITH CHECK (true);

-- ======================================================================
--  STARTER ROWS  (so tables aren't empty)
-- ======================================================================
INSERT INTO mcp_model_registry (model_name, version, meta)
VALUES ('gpt-4o', '2025-07-12', '{}') 
ON CONFLICT (model_name, version) DO NOTHING;