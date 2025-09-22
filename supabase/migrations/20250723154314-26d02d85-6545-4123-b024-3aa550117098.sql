-- Add unique constraint on business name to support upsert operations
ALTER TABLE public.businesses ADD CONSTRAINT businesses_name_unique UNIQUE (name);

-- Create index for better performance on name lookups
CREATE INDEX IF NOT EXISTS idx_businesses_name ON public.businesses(name);