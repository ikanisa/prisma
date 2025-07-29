-- Fix the agents table and insert default agent
INSERT INTO agents (id, name, description, status, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Default Omni Agent',
  'Default autonomous agent for easyMO WhatsApp operations',
  'active',
  now()
) ON CONFLICT (id) DO NOTHING;

-- Make sure agent_skills has proper foreign key constraint
ALTER TABLE agent_skills DROP CONSTRAINT IF EXISTS agent_skills_agent_id_fkey;
ALTER TABLE agent_skills ADD CONSTRAINT agent_skills_agent_id_fkey 
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

-- Insert default skills for the default agent
INSERT INTO agent_skills (agent_id, skill, enabled, config) VALUES
  ('00000000-0000-0000-0000-000000000000', 'PaymentSkill', true, '{"max_amount": 1000000, "currency": "RWF"}'),
  ('00000000-0000-0000-0000-000000000000', 'TransportSkill', true, '{"max_distance_km": 50, "default_vehicle_type": "moto"}'),
  ('00000000-0000-0000-0000-000000000000', 'CommerceSkill', true, '{"max_cart_items": 20, "delivery_radius_km": 25}'),
  ('00000000-0000-0000-0000-000000000000', 'MemorySkill', true, '{"max_context_length": 8000, "similarity_threshold": 0.7}'),
  ('00000000-0000-0000-0000-000000000000', 'FeedbackSkill', false, '{"auto_collect": true, "rating_scale": 5}'),
  ('00000000-0000-0000-0000-000000000000', 'ConversationSkill', true, '{"max_turns": 20, "context_retention": true}')
ON CONFLICT (agent_id, skill) DO NOTHING;