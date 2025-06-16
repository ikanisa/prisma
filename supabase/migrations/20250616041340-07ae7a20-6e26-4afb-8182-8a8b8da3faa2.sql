
-- Add lighting tracking fields to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS lighting_conditions text,
ADD COLUMN IF NOT EXISTS torch_used boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.transactions.lighting_conditions IS 'Detected lighting conditions during scan (bright, normal, dim, dark)';
COMMENT ON COLUMN public.transactions.torch_used IS 'Whether flashlight/torch was used during scanning';
