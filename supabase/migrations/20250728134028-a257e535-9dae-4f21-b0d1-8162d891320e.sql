-- Create missing wa_contacts table for WhatsApp contact management
CREATE TABLE public.wa_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wa_id text NOT NULL UNIQUE,
  profile_name text,
  phone_number text,
  status text DEFAULT 'active',
  last_seen timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wa_contacts ENABLE ROW LEVEL SECURITY;

-- Create policy for system access
CREATE POLICY "System can manage wa_contacts" 
ON public.wa_contacts 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_wa_contacts_wa_id ON public.wa_contacts(wa_id);
CREATE INDEX idx_wa_contacts_updated_at ON public.wa_contacts(updated_at);