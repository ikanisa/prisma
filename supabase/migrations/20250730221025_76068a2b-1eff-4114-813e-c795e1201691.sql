-- Create knowledge_documents table for vector pipeline
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL, -- persona | doc | button | skill | journey | faq
  source_ref TEXT NOT NULL,  -- path or table.row_id
  chunk_index INTEGER NOT NULL DEFAULT 0,
  domain TEXT,               -- payments, mobility_driver, etc
  lang TEXT DEFAULT 'en',
  content TEXT NOT NULL,
  hash TEXT NOT NULL,        -- sha256 for deduplication
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_knowledge_hash ON knowledge_documents(hash);
CREATE INDEX IF NOT EXISTS idx_knowledge_domain ON knowledge_documents(domain);
CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge_documents(source_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_lang ON knowledge_documents(lang);

-- Enable RLS
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

-- Allow system access to manage knowledge documents
CREATE POLICY "System can manage knowledge documents" 
ON knowledge_documents 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Allow admin access
CREATE POLICY "Admin can manage knowledge documents" 
ON knowledge_documents 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());