-- Fix critical database issues causing the errors

-- 1. Fix orders table - add missing 'total' column
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total INTEGER DEFAULT 0;

-- 2. Ensure phone numbers are handled correctly as text, not UUIDs
-- Update user_profiles table to use phone as text if needed
ALTER TABLE public.user_profiles 
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- 3. Update conversation_summaries to use phone as text
ALTER TABLE public.conversation_summaries 
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- 4. Update memory_cache to use phone as text  
ALTER TABLE public.memory_cache 
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- 5. Update agent_conversations to use phone as text
ALTER TABLE public.agent_conversations 
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- 6. Update agent_execution_log to use phone as text
ALTER TABLE public.agent_execution_log 
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;