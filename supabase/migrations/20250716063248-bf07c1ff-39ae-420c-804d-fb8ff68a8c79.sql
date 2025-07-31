-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector store table for embeddings
CREATE TABLE IF NOT EXISTS public.vector_store (
  doc_id uuid,
  chunk text,
  embedding vector(1536),
  PRIMARY KEY (doc_id, chunk)
);

-- Enable RLS on vector_store
ALTER TABLE public.vector_store ENABLE ROW LEVEL SECURITY;

-- Admin access to vector store
CREATE POLICY "Admin full access to vector store" ON public.vector_store
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Create function to upsert embeddings
CREATE OR REPLACE FUNCTION public.upsert_embedding(
  doc_id uuid, 
  chunk text, 
  embedding vector(1536)
)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.vector_store(doc_id, chunk, embedding)
  VALUES (doc_id, chunk, embedding)
  ON CONFLICT (doc_id, chunk) DO UPDATE
  SET embedding = excluded.embedding;
END;
$$;