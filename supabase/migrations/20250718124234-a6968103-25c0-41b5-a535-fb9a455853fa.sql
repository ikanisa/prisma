-- Create farmers table
CREATE TABLE IF NOT EXISTS public.farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  location TEXT,
  status TEXT DEFAULT 'active',
  listings_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;

-- Create admin policy for farmers
CREATE POLICY "Admin full access to farmers" ON public.farmers
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- Create search function
CREATE OR REPLACE FUNCTION public.list_farmers(search_term TEXT)
RETURNS SETOF farmers 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
  RETURN QUERY 
  SELECT * FROM farmers
  WHERE search_term IS NULL
     OR name ILIKE '%'||search_term||'%'
     OR phone ILIKE '%'||search_term||'%'
  ORDER BY created_at DESC;
END;
$$;