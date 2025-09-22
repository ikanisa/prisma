
-- Create payment_requests table for the MoMo QR Payment Generator
CREATE TABLE public.payment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  momo_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  ussd_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for session-based access
CREATE POLICY "Users can manage their own payment requests" 
  ON public.payment_requests 
  FOR ALL 
  USING (session_id = current_setting('app.session_id', true));

-- Create index for performance
CREATE INDEX idx_payment_requests_session_id ON public.payment_requests(session_id);
CREATE INDEX idx_payment_requests_created_at ON public.payment_requests(created_at DESC);
