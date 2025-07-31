-- Create comprehensive vector embeddings table for all agent resources
CREATE TABLE IF NOT EXISTS public.agent_resource_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type TEXT NOT NULL, -- 'action_button', 'template', 'skill', 'persona', 'document', 'user_journey'
  resource_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_agent_resource_embeddings_vector 
ON public.agent_resource_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Create index for resource lookup
CREATE INDEX IF NOT EXISTS idx_agent_resource_embeddings_resource 
ON public.agent_resource_embeddings (resource_type, resource_id);

-- Enable RLS
ALTER TABLE public.agent_resource_embeddings ENABLE ROW LEVEL SECURITY;

-- Create policy for system access
CREATE POLICY "System can manage resource embeddings" 
ON public.agent_resource_embeddings 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to update embedding timestamps
CREATE OR REPLACE FUNCTION update_embedding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp updates
CREATE TRIGGER update_agent_resource_embeddings_timestamp
BEFORE UPDATE ON public.agent_resource_embeddings
FOR EACH ROW
EXECUTE FUNCTION update_embedding_timestamp();