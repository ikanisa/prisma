-- Complete missing tables and fix RLS policies

-- Create additional required tables
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

CREATE TABLE IF NOT EXISTS public.memory_consolidation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  summary_token_len integer,
  new_memories integer,
  created_at timestamp with time zone DEFAULT now()
);

-- Update agent_memory table for contact_id consistency
ALTER TABLE public.agent_memory 
ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS knowledge_documents_domain_lang_idx ON public.knowledge_documents(domain, lang);
CREATE INDEX IF NOT EXISTS knowledge_documents_source_type_idx ON public.knowledge_documents(source_type);
CREATE INDEX IF NOT EXISTS agent_memory_contact_id_type_idx ON public.agent_memory(contact_id, memory_type);

-- Update RLS policies for contacts and conversations
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System can manage contacts" ON public.contacts;
DROP POLICY IF EXISTS "System manage contacts" ON public.contacts;
CREATE POLICY "System can manage contacts" ON public.contacts
FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System can manage conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admin access conversations" ON public.conversations;
DROP POLICY IF EXISTS "User conversation access" ON public.conversations;
CREATE POLICY "System can manage conversations" ON public.conversations  
FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for new tables
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System can manage knowledge documents" ON public.knowledge_documents
FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.memory_consolidation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System can manage memory consolidation log" ON public.memory_consolidation_log
FOR ALL USING (true) WITH CHECK (true);