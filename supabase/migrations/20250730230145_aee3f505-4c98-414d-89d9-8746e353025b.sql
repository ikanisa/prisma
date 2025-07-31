-- =======================================================================
-- Core conversation tracking tables (new)
-- =======================================================================
CREATE TABLE IF NOT EXISTS conversations (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_wa_id    text NOT NULL,           -- WhatsApp number reference
    channel          text DEFAULT 'whatsapp',
    started_at       timestamptz DEFAULT now(),
    last_message_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conv_contact_wa_id ON conversations(contact_wa_id);

-- Update contacts table to match expected schema
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS wa_id text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS language text DEFAULT 'en';
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_wa_id_unique ON contacts(wa_id) WHERE wa_id IS NOT NULL;

-- =======================================================================
-- Memory consolidation tracking
-- =======================================================================
CREATE TABLE IF NOT EXISTS memory_consolidation_log (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_wa_id    text NOT NULL,
    consolidated_at  timestamptz DEFAULT now(),
    summary_token_len int,
    new_memories      int
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

-- Enable RLS on new tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_consolidation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_model_registry ENABLE ROW LEVEL SECURITY;

-- Create system policies
CREATE POLICY "System can manage conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage memory_consolidation_log" ON memory_consolidation_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage mcp_model_registry" ON mcp_model_registry FOR ALL USING (true) WITH CHECK (true);

-- Update existing agent_memory to use contact wa_id
ALTER TABLE agent_memory ADD COLUMN IF NOT EXISTS contact_wa_id text;
ALTER TABLE agent_memory ADD COLUMN IF NOT EXISTS content text;

-- Update existing agent_tool_calls to use conversation_id
ALTER TABLE agent_tool_calls ADD COLUMN IF NOT EXISTS conversation_id uuid;
ALTER TABLE agent_tool_calls ADD COLUMN IF NOT EXISTS skill_name text;
ALTER TABLE agent_tool_calls ADD COLUMN IF NOT EXISTS input_params jsonb;
ALTER TABLE agent_tool_calls ADD COLUMN IF NOT EXISTS output_payload jsonb;
ALTER TABLE agent_tool_calls ADD COLUMN IF NOT EXISTS latency_ms int;

-- Update existing agent_skills to match expected schema
ALTER TABLE agent_skills ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE agent_skills ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE agent_skills ADD COLUMN IF NOT EXISTS signature jsonb;

-- Update existing automated_tasks to use contact reference
ALTER TABLE automated_tasks ADD COLUMN IF NOT EXISTS contact_wa_id text;
ALTER TABLE automated_tasks ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE automated_tasks ADD COLUMN IF NOT EXISTS schedule text;
ALTER TABLE automated_tasks ADD COLUMN IF NOT EXISTS next_run timestamptz;
ALTER TABLE automated_tasks ADD COLUMN IF NOT EXISTS is_enabled boolean DEFAULT true;

-- Update existing agent_tasks to match expected schema
ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS task_id uuid;
ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS run_at timestamptz DEFAULT now();

-- Update existing agent_learning for job tracking
ALTER TABLE agent_learning ADD COLUMN IF NOT EXISTS job_name text;
ALTER TABLE agent_learning ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE agent_learning ADD COLUMN IF NOT EXISTS run_at timestamptz DEFAULT now();
ALTER TABLE agent_learning ADD COLUMN IF NOT EXISTS details jsonb;

-- Update existing agent_document_embeddings
ALTER TABLE agent_document_embeddings ADD COLUMN IF NOT EXISTS source_type text;
ALTER TABLE agent_document_embeddings ADD COLUMN IF NOT EXISTS source_ref text;
ALTER TABLE agent_document_embeddings ADD COLUMN IF NOT EXISTS vector_id text;

-- Starter rows so tables are non-empty
INSERT INTO mcp_model_registry (model_name, version, meta)
VALUES ('gpt-4o', '2025-07-12', '{"temperature":0.2}')
ON CONFLICT DO NOTHING;

INSERT INTO agent_skills (name, description, signature) 
VALUES
 ('payment_qr_generate', 'Generate MoMo QR', '{"amount":"int","momo_number":"string"}'),
 ('driver_trip_create', 'Create driver trip', '{"pickup":"string","dropoff":"string"}')
ON CONFLICT (name) DO NOTHING;