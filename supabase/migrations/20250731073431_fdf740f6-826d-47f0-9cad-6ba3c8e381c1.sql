-- Phase 1: Schema Alignment for Contact & Conversation Bootstrap

-- Add missing columns to contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS wa_id text,
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS language text DEFAULT 'en';

-- Create unique index on wa_id for upserts
CREATE UNIQUE INDEX IF NOT EXISTS contacts_wa_id_unique ON public.contacts(wa_id);

-- Add missing columns to conversations table  
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_message_at timestamp with time zone DEFAULT now();

-- Create index for conversation lookups
CREATE INDEX IF NOT EXISTS conversations_contact_id_started_at_idx ON public.conversations(contact_id, started_at DESC);

-- Update RLS policies for contacts to support wa_id lookups
DROP POLICY IF EXISTS "System can manage contacts" ON public.contacts;
CREATE POLICY "System can manage contacts" ON public.contacts
FOR ALL USING (true) WITH CHECK (true);

-- Update RLS policies for conversations
DROP POLICY IF EXISTS "System can manage conversations" ON public.conversations;
CREATE POLICY "System can manage conversations" ON public.conversations  
FOR ALL USING (true) WITH CHECK (true);

-- Ensure agent_memory table exists with correct schema for memory system
CREATE TABLE IF NOT EXISTS public.agent_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  memory_type text NOT NULL,
  memory_value text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Update agent_memory to use contact_id instead of user_id for consistency
ALTER TABLE public.agent_memory 
ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE;

-- Create index for memory lookups
CREATE INDEX IF NOT EXISTS agent_memory_contact_id_type_idx ON public.agent_memory(contact_id, memory_type);

-- Ensure automated_tasks table exists
CREATE TABLE IF NOT EXISTS public.automated_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  title text NOT NULL,
  prompt text NOT NULL, 
  schedule text NOT NULL,
  next_run timestamp with time zone NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create unique constraint for contact_id + title
CREATE UNIQUE INDEX IF NOT EXISTS automated_tasks_contact_title_unique ON public.automated_tasks(contact_id, title);

-- Create knowledge_documents table for RAG system
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_ref text NOT NULL,
  chunk_index integer NOT NULL DEFAULT 0,
  domain text NOT NULL DEFAULT 'core',
  lang text NOT NULL DEFAULT 'en',
  content text NOT NULL,
  hash text UNIQUE,
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for knowledge document lookups
CREATE INDEX IF NOT EXISTS knowledge_documents_domain_lang_idx ON public.knowledge_documents(domain, lang);
CREATE INDEX IF NOT EXISTS knowledge_documents_source_type_idx ON public.knowledge_documents(source_type);

-- Create memory_consolidation_log table for tracking memory consolidation
CREATE TABLE IF NOT EXISTS public.memory_consolidation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  summary_token_len integer,
  new_memories integer,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS policies for new tables
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System can manage knowledge documents" ON public.knowledge_documents
FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.automated_tasks ENABLE ROW LEVEL SECURITY;  
CREATE POLICY "System can manage automated tasks" ON public.automated_tasks
FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.memory_consolidation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System can manage memory consolidation log" ON public.memory_consolidation_log
FOR ALL USING (true) WITH CHECK (true);