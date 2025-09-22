-- easyMO Omni-Agent System Database Cleanup & Consolidation
-- This migration removes legacy multi-agent structures and creates a clean omni-agent system

-- 1. Clean up legacy agent data (keep only the essential omni-agent structure)
DELETE FROM agent_runs WHERE agent_code NOT IN ('omni-agent', 'omni_agent');
DELETE FROM agent_tool_calls WHERE run_id NOT IN (SELECT id FROM agent_runs);
DELETE FROM agent_execution_log WHERE function_name NOT LIKE '%omni-agent%';
DELETE FROM agent_tasks WHERE agent_id NOT IN (SELECT id FROM agents WHERE name = 'OmniAgent');
DELETE FROM agent_personas WHERE agent_id NOT IN (SELECT id FROM agents WHERE name = 'OmniAgent');
DELETE FROM agent_learning WHERE agent_id NOT IN (SELECT id FROM agents WHERE name = 'OmniAgent');
DELETE FROM agent_logs WHERE agent_id NOT IN (SELECT id FROM agents WHERE name = 'OmniAgent');
DELETE FROM agent_documents WHERE agent_id NOT IN (SELECT id FROM agents WHERE name = 'OmniAgent');

-- 2. Clean up assistant configs (keep only essential ones)
DELETE FROM assistant_configs WHERE name NOT IN ('easyMO Omni Agent', 'OmniAgent');

-- 3. Reset agents table to single omni-agent
DELETE FROM agents WHERE name != 'OmniAgent';

-- Insert the main OmniAgent if it doesn't exist
INSERT INTO agents (id, name, description, status, created_at) 
VALUES (
  gen_random_uuid(),
  'OmniAgent',
  'Unified AI agent handling all easyMO services: payments, transport, commerce, listings, and support',
  'active',
  now()
) ON CONFLICT (name) DO NOTHING;

-- 4. Clean up agent_configs table (keep only omni-agent config)
DELETE FROM agent_configs WHERE name NOT LIKE '%omni%' AND name NOT LIKE '%Omni%';

-- Insert omni-agent config if needed
INSERT INTO agent_configs (
  id,
  code,
  name,
  description,
  assistant_id,
  system_prompt,
  temperature,
  tools_json,
  active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'omni-agent',
  'easyMO Omni Agent',
  'Unified AI agent for all easyMO services',
  'asst_omni_agent_placeholder',
  'You are the easyMO Omni Agent, a unified AI assistant that handles all services including payments, transport, marketplace, listings, and customer support.',
  0.3,
  '[]'::jsonb,
  true,
  now(),
  now()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = now();

-- 5. Create omni_agent_skills table to track skill usage
CREATE TABLE IF NOT EXISTS omni_agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name TEXT NOT NULL,
  skill_description TEXT,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE omni_agent_skills ENABLE ROW LEVEL SECURITY;

-- Create policy for omni_agent_skills
CREATE POLICY "System can manage omni agent skills" ON omni_agent_skills
  FOR ALL USING (true) WITH CHECK (true);

-- Insert the core skills
INSERT INTO omni_agent_skills (skill_name, skill_description, is_active) VALUES
  ('PaymentSkill', 'Handles mobile money payments, QR generation, and payment processing', true),
  ('TransportSkill', 'Manages moto rides, driver assignments, and trip coordination', true),
  ('ListingsSkill', 'Handles property and vehicle listings, search, and management', true),
  ('CommerceSkill', 'Manages pharmacy, hardware, and bar orders and transactions', true),
  ('DataSyncSkill', 'Handles data synchronization from Google Places, CSV imports', true),
  ('AdminSupportSkill', 'Provides customer support, feedback collection, and human handoff', true)
ON CONFLICT (skill_name) DO UPDATE SET
  skill_description = EXCLUDED.skill_description,
  updated_at = now();

-- 6. Create omni_agent_conversations table to replace multiple conversation tables
CREATE TABLE IF NOT EXISTS omni_agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  message_text TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
  skill_used TEXT,
  intent_detected TEXT,
  confidence_score NUMERIC,
  response_time_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE omni_agent_conversations ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "System can manage omni conversations" ON omni_agent_conversations
  FOR ALL USING (true) WITH CHECK (true);

-- 7. Create omni_agent_metrics table for unified metrics
CREATE TABLE IF NOT EXISTS omni_agent_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  skill_name TEXT,
  metric_value NUMERIC NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE omni_agent_metrics ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "System can manage omni metrics" ON omni_agent_metrics
  FOR ALL USING (true) WITH CHECK (true);

-- 8. Insert initial metrics
INSERT INTO omni_agent_metrics (metric_type, skill_name, metric_value, metadata) VALUES
  ('skill_activation', 'PaymentSkill', 1, '{"status": "active"}'),
  ('skill_activation', 'TransportSkill', 1, '{"status": "active"}'),
  ('skill_activation', 'ListingsSkill', 1, '{"status": "active"}'),
  ('skill_activation', 'CommerceSkill', 1, '{"status": "active"}'),
  ('skill_activation', 'DataSyncSkill', 1, '{"status": "active"}'),
  ('skill_activation', 'AdminSupportSkill', 1, '{"status": "active"}');

-- 9. Clean up any orphaned data
DELETE FROM agent_memory WHERE user_id NOT IN (SELECT phone_number FROM contacts);
DELETE FROM agent_memory_enhanced WHERE user_id NOT IN (SELECT phone_number FROM contacts);

-- 10. Update conversation_messages to link to omni-agent
UPDATE conversation_messages 
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'), 
  '{agent_type}', 
  '"omni-agent"'
) 
WHERE metadata IS NULL OR metadata ->> 'agent_type' IS NULL;