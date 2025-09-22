-- Fix the agents and agent_skills relationship issue
-- First, check if we need to create a default agent
INSERT INTO agents (id, name, type, description, status, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Default Omni Agent',
  'omni',
  'Default autonomous agent for easyMO WhatsApp operations',
  'active',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Create agent skills table if it doesn't exist with proper structure
CREATE TABLE IF NOT EXISTS agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(agent_id, skill)
);

-- Enable RLS on agent_skills
ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for agent_skills
CREATE POLICY "Users can view agent skills" ON agent_skills FOR SELECT USING (true);
CREATE POLICY "Users can manage agent skills" ON agent_skills FOR ALL USING (true);

-- Insert default skills for the default agent
INSERT INTO agent_skills (agent_id, skill, enabled, config) VALUES
  ('00000000-0000-0000-0000-000000000000', 'PaymentSkill', true, '{"max_amount": 1000000, "currency": "RWF"}'),
  ('00000000-0000-0000-0000-000000000000', 'TransportSkill', true, '{"max_distance_km": 50, "default_vehicle_type": "moto"}'),
  ('00000000-0000-0000-0000-000000000000', 'CommerceSkill', true, '{"max_cart_items": 20, "delivery_radius_km": 25}'),
  ('00000000-0000-0000-0000-000000000000', 'MemorySkill', true, '{"max_context_length": 8000, "similarity_threshold": 0.7}'),
  ('00000000-0000-0000-0000-000000000000', 'FeedbackSkill', false, '{"auto_collect": true, "rating_scale": 5}'),
  ('00000000-0000-0000-0000-000000000000', 'ConversationSkill', true, '{"max_turns": 20, "context_retention": true}')
ON CONFLICT (agent_id, skill) DO NOTHING;