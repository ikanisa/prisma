-- Task-1: Update schema for first_seen_ts, enhanced memory, and skills

-- 1. Add first_seen_ts to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_seen_ts timestamptz DEFAULT now();

-- 2. Ensure incoming_messages.user_id has FK to users.id
ALTER TABLE public.incoming_messages
  DROP CONSTRAINT IF EXISTS incoming_messages_user_id_fkey;
ALTER TABLE public.incoming_messages
  ADD CONSTRAINT incoming_messages_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. Add embedding to enhanced memory and index via HNSW
ALTER TABLE public.agent_memory_enhanced
  ADD COLUMN IF NOT EXISTS embedding vector(512);
CREATE INDEX IF NOT EXISTS idx_agent_memory_enhanced_embedding
  ON public.agent_memory_enhanced USING hnsw (embedding vector_l2_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. Add confidence column to agent_skills
ALTER TABLE public.agent_skills
  ADD COLUMN IF NOT EXISTS confidence numeric DEFAULT 0.5;
