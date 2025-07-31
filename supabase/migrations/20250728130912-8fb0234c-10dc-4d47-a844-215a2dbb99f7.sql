-- Check if incoming_messages table exists and create it properly
DROP TABLE IF EXISTS public.incoming_messages;

CREATE TABLE public.incoming_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_number TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  message_text TEXT,
  raw_payload JSONB,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for security
ALTER TABLE public.incoming_messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role access (for admin functions)
CREATE POLICY "Allow service role access" 
ON public.incoming_messages 
FOR ALL 
USING (true);

-- Create index for better performance
CREATE INDEX idx_incoming_messages_from_number ON public.incoming_messages(from_number);
CREATE INDEX idx_incoming_messages_created_at ON public.incoming_messages(created_at);
CREATE INDEX idx_incoming_messages_processed ON public.incoming_messages(processed);