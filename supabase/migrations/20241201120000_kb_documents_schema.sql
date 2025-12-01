-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create kb_documents table
CREATE TABLE IF NOT EXISTS public.kb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(1536), -- text-embedding-3-small dimension
  metadata JSONB DEFAULT '{}'::jsonb,
  category TEXT NOT NULL,
  jurisdiction TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT kb_documents_category_check CHECK (category IN (
    'TAX', 'IFRS', 'US_GAAP', 'ISA', 'CORP', 'REG', 'GOVERNANCE', 
    'AUDIT_REG', 'KNOWLEDGE', 'LAW'
  ))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS kb_documents_embedding_idx ON public.kb_documents 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS kb_documents_category_idx ON public.kb_documents(category);
CREATE INDEX IF NOT EXISTS kb_documents_jurisdiction_idx ON public.kb_documents(jurisdiction);
CREATE INDEX IF NOT EXISTS kb_documents_tags_idx ON public.kb_documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS kb_documents_content_idx ON public.kb_documents USING GIN(to_tsvector('english', content));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_kb_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kb_documents_updated_at_trigger
  BEFORE UPDATE ON public.kb_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_kb_documents_updated_at();

-- Create vector search function
CREATE OR REPLACE FUNCTION public.match_kb_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.72,
  match_count int DEFAULT 15,
  filter_category text DEFAULT NULL,
  filter_jurisdictions text[] DEFAULT NULL,
  filter_tags text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  category text,
  jurisdiction text,
  tags text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb_documents.id,
    kb_documents.content,
    kb_documents.metadata,
    kb_documents.category,
    kb_documents.jurisdiction,
    kb_documents.tags,
    1 - (kb_documents.embedding <=> query_embedding) AS similarity
  FROM public.kb_documents
  WHERE 
    -- Similarity threshold
    1 - (kb_documents.embedding <=> query_embedding) >= match_threshold
    -- Category filter
    AND (filter_category IS NULL OR kb_documents.category = filter_category)
    -- Jurisdiction filter (includes GLOBAL by default)
    AND (
      filter_jurisdictions IS NULL 
      OR kb_documents.jurisdiction = ANY(filter_jurisdictions)
      OR kb_documents.jurisdiction = 'GLOBAL'
    )
    -- Tags filter (any match)
    AND (
      filter_tags IS NULL 
      OR kb_documents.tags && filter_tags
    )
  ORDER BY kb_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kb_documents TO authenticated;
GRANT SELECT ON public.kb_documents TO anon;
GRANT EXECUTE ON FUNCTION public.match_kb_documents TO anon, authenticated;

-- Add RLS policies
ALTER TABLE public.kb_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "KB documents are viewable by everyone"
  ON public.kb_documents FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert KB documents"
  ON public.kb_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update KB documents"
  ON public.kb_documents FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete KB documents"
  ON public.kb_documents FOR DELETE
  TO authenticated
  USING (true);

COMMENT ON TABLE public.kb_documents IS 'Knowledge base documents with vector embeddings for semantic search';
COMMENT ON FUNCTION public.match_kb_documents IS 'Semantic search with category, jurisdiction, and tag filtering';
