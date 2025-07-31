-- ======================================================================
-- BASELINE MIGRATION: Fix existing schema and add missing tables
-- ======================================================================

-- Update contacts table to match required schema  
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS wa_id text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS language text DEFAULT 'en';
CREATE UNIQUE INDEX IF NOT EXISTS contacts_wa_id_unique ON contacts(wa_id) WHERE wa_id IS NOT NULL;

-- Update conversations table to use contact_id instead of contact_wa_id
ALTER TABLE conversations DROP COLUMN IF EXISTS contact_wa_id;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS contact_id uuid;
ALTER TABLE conversations ADD CONSTRAINT fk_conversations_contact_id FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_conv_contact ON conversations(contact_id);

-- Create bridge_conversations table if it doesn't exist
CREATE TABLE IF NOT EXISTS bridge_conversations (
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

-- Update agent_memory to use contact_id instead of contact_wa_id  
ALTER TABLE agent_memory DROP COLUMN IF EXISTS contact_wa_id;
ALTER TABLE agent_memory ADD COLUMN IF NOT EXISTS contact_id uuid;
ALTER TABLE agent_memory ADD CONSTRAINT fk_agent_memory_contact_id FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

-- Update agent_memory_enhanced to use contact_id
ALTER TABLE agent_memory_enhanced DROP COLUMN IF EXISTS contact_wa_id;
ALTER TABLE agent_memory_enhanced ADD COLUMN IF NOT EXISTS contact_id uuid;
ALTER TABLE agent_memory_enhanced ADD CONSTRAINT fk_agent_memory_enhanced_contact_id FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

-- Ensure agent_skills has the right structure
ALTER TABLE agent_skills ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE agent_skills ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE agent_skills ADD COLUMN IF NOT EXISTS signature jsonb;

-- Update agent_tool_calls structure
ALTER TABLE agent_tool_calls ADD COLUMN IF NOT EXISTS conversation_id uuid;
ALTER TABLE agent_tool_calls ADD COLUMN IF NOT EXISTS skill_id uuid;
ALTER TABLE agent_tool_calls ADD COLUMN IF NOT EXISTS input_params jsonb;
ALTER TABLE agent_tool_calls ADD COLUMN IF NOT EXISTS output_payload jsonb;
ALTER TABLE agent_tool_calls ADD COLUMN IF NOT EXISTS latency_ms int;
ALTER TABLE agent_tool_calls ADD CONSTRAINT fk_agent_tool_calls_conversation_id FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE agent_tool_calls ADD CONSTRAINT fk_agent_tool_calls_skill_id FOREIGN KEY (skill_id) REFERENCES agent_skills(id);

-- Update automated_tasks structure
ALTER TABLE automated_tasks ADD COLUMN IF NOT EXISTS contact_id uuid;
ALTER TABLE automated_tasks ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE automated_tasks ADD COLUMN IF NOT EXISTS schedule text;
ALTER TABLE automated_tasks ADD COLUMN IF NOT EXISTS next_run timestamptz;
ALTER TABLE automated_tasks ADD COLUMN IF NOT EXISTS is_enabled boolean DEFAULT true;
ALTER TABLE automated_tasks ADD CONSTRAINT fk_automated_tasks_contact_id FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

-- Update agent_tasks structure
ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS task_id uuid;
ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS run_at timestamptz DEFAULT now();
ALTER TABLE agent_tasks ADD CONSTRAINT fk_agent_tasks_task_id FOREIGN KEY (task_id) REFERENCES automated_tasks(id) ON DELETE CASCADE;

-- Enable RLS on new/updated tables
ALTER TABLE bridge_conversations ENABLE ROW LEVEL SECURITY;

-- Create system policies for bridge_conversations
CREATE POLICY "System can manage bridge_conversations" ON bridge_conversations FOR ALL USING (true) WITH CHECK (true);

-- Insert starter data
INSERT INTO mcp_model_registry (model_name, version, meta)
VALUES ('gpt-4o', '2025-07-12', '{}')
ON CONFLICT DO NOTHING;

-- Insert basic agent skills
INSERT INTO agent_skills (name, description, signature) 
VALUES
 ('payment_qr_generate', 'Generate MoMo QR', '{"amount":"int","momo_number":"string"}'),
 ('driver_trip_create', 'Create driver trip', '{"pickup":"string","dropoff":"string"}')
ON CONFLICT (name) DO NOTHING;