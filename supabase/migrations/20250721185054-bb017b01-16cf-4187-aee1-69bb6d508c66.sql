-- Create payment_sessions table for tracking QR scan sessions and payment flows
CREATE TABLE IF NOT EXISTS public.payment_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'payment', -- 'payment', 'qr_scan', 'receive'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'expired'
  amount NUMERIC,
  payment_id UUID,
  qr_data TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '1 hour')
);

-- Enable RLS on payment_sessions
ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_sessions
CREATE POLICY "System can manage payment sessions" 
ON public.payment_sessions 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Admin can view payment sessions" 
ON public.payment_sessions 
FOR SELECT 
USING (is_admin());

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_payment_sessions_phone ON public.payment_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status ON public.payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_expires ON public.payment_sessions(expires_at);

-- Add QR code functionality to existing payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS qr_code_url TEXT,
ADD COLUMN IF NOT EXISTS qr_data TEXT,
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'standard'; -- 'standard', 'receive', 'qr_generated'

-- Create storage bucket for QR codes if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qr-codes', 'qr-codes', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for QR codes
CREATE POLICY "QR codes are publicly viewable" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'qr-codes');

CREATE POLICY "System can upload QR codes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'qr-codes');

CREATE POLICY "System can update QR codes" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'qr-codes');

-- Create function to clean up expired payment sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_payment_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.payment_sessions 
  WHERE expires_at < now() AND status != 'completed';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Create trigger to auto-update updated_at on payment_sessions
CREATE OR REPLACE FUNCTION public.update_payment_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_sessions_updated_at
  BEFORE UPDATE ON public.payment_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_sessions_updated_at();