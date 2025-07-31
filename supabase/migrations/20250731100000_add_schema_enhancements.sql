-- Add first_seen_ts to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_seen_ts TIMESTAMPTZ DEFAULT now();

-- Add user_id foreign key to incoming_messages
ALTER TABLE public.incoming_messages
  ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.incoming_messages
  ADD CONSTRAINT IF NOT EXISTS fk_incoming_messages_user
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Enhance agent_memory_enhanced with vector embedding and index
ALTER TABLE public.agent_memory_enhanced
  ADD COLUMN IF NOT EXISTS embedding VECTOR(512);
CREATE INDEX IF NOT EXISTS idx_agent_memory_enhanced_embedding
  ON public.agent_memory_enhanced USING hnsw (embedding)
  WITH (m = 16, ef_construction = 64);

-- Add confidence column to agent_skills
ALTER TABLE public.agent_skills
  ADD COLUMN IF NOT EXISTS confidence NUMERIC DEFAULT 0.5;
