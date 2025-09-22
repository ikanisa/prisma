-- Create incoming_messages table for WhatsApp webhook
CREATE TABLE IF NOT EXISTS public.incoming_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.incoming_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for incoming_messages
CREATE POLICY "Admin can manage incoming messages" 
ON public.incoming_messages 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "System can insert incoming messages" 
ON public.incoming_messages 
FOR INSERT 
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_incoming_messages_phone_number ON public.incoming_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_incoming_messages_status ON public.incoming_messages(status);
CREATE INDEX IF NOT EXISTS idx_incoming_messages_created_at ON public.incoming_messages(created_at);

-- Create updated_at trigger
CREATE TRIGGER update_incoming_messages_updated_at
    BEFORE UPDATE ON public.incoming_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();