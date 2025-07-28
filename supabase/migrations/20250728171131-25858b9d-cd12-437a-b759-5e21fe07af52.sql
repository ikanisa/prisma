-- Update existing payments table and add missing components for QR payments system

-- Add missing columns to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'inbound',
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'RWF',
ADD COLUMN IF NOT EXISTS momo_number TEXT,
ADD COLUMN IF NOT EXISTS ref TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update direction column to have proper constraints
ALTER TABLE public.payments 
ADD CONSTRAINT payments_direction_check 
CHECK (direction IN ('inbound', 'outbound'));

-- Update amount column to use numeric for better precision
ALTER TABLE public.payments 
ALTER COLUMN amount TYPE NUMERIC(12,2);

-- Create payment_events table for audit trail
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id_created_at ON public.payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id ON public.payment_events(payment_id);

-- Enable RLS on new table
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_events table
DROP POLICY IF EXISTS "Users can view their payment events" ON public.payment_events;
CREATE POLICY "Users can view their payment events" 
ON public.payment_events 
FOR SELECT 
USING (payment_id IN (
  SELECT id FROM public.payments WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "System can manage all payment events" ON public.payment_events;
CREATE POLICY "System can manage all payment events" 
ON public.payment_events 
FOR ALL 
USING (true);

-- Create enhanced RPC function for inserting payments
CREATE OR REPLACE FUNCTION public.payments_insert_enhanced(
  p_direction TEXT,
  p_amount NUMERIC DEFAULT NULL,
  p_qr_url TEXT DEFAULT NULL,
  p_momo_number TEXT DEFAULT NULL,
  p_ref TEXT DEFAULT NULL,
  p_momo_code TEXT DEFAULT NULL,
  p_ussd_code TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payment_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Insert payment with enhanced fields
  INSERT INTO public.payments (
    user_id, direction, amount, momo_number, qr_code_url, ref, momo_code, ussd_code
  ) VALUES (
    current_user_id, p_direction, p_amount, p_momo_number, p_qr_url, p_ref, p_momo_code, p_ussd_code
  ) RETURNING id INTO payment_id;

  -- Log creation event
  INSERT INTO public.payment_events (payment_id, event_type, payload)
  VALUES (payment_id, 'created', jsonb_build_object(
    'direction', p_direction,
    'amount', p_amount,
    'momo_number', p_momo_number,
    'ref', p_ref
  ));

  RETURN payment_id;
END;
$$;

-- Create RPC function for marking payments as paid
CREATE OR REPLACE FUNCTION public.payments_mark_paid(
  p_payment_id UUID,
  p_confirmation_note TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  payment_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get payment user_id to verify ownership
  SELECT user_id INTO payment_user_id 
  FROM public.payments 
  WHERE id = p_payment_id;

  IF payment_user_id IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF payment_user_id != current_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Update payment status
  UPDATE public.payments 
  SET status = 'paid'::payment_status, 
      paid_at = now(),
      updated_at = now()
  WHERE id = p_payment_id AND status = 'pending'::payment_status;

  -- Log paid event
  INSERT INTO public.payment_events (payment_id, event_type, payload)
  VALUES (p_payment_id, 'marked_paid', jsonb_build_object(
    'confirmation_note', p_confirmation_note,
    'confirmed_by', current_user_id
  ));

  RETURN TRUE;
END;
$$;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();