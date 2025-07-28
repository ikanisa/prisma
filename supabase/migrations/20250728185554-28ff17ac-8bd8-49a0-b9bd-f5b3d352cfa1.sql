-- QR Payments System Migration (Clean Version)
-- Creates tables and functions for QR code payment generation and processing

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "System can manage all payment events" ON public.payment_events;
DROP POLICY IF EXISTS "System can manage all payments" ON public.payments;

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    amount NUMERIC(12,2),
    currency TEXT NOT NULL DEFAULT 'RWF',
    momo_number TEXT,
    qr_url TEXT,
    ref TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment_events table for audit trail
CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('qr-codes', 'qr-codes', true, 5242880, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id_created_at ON public.payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_direction ON public.payments(direction);
CREATE INDEX IF NOT EXISTS idx_payments_ref ON public.payments(ref);
CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id ON public.payment_events(payment_id);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments
CREATE POLICY "Users can view own payments"
    ON public.payments FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own payments"
    ON public.payments FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pending payments"
    ON public.payments FOR UPDATE
    USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "System can manage payments"
    ON public.payments FOR ALL
    USING (true);

CREATE POLICY "Admin can manage payments"
    ON public.payments FOR ALL
    USING (is_admin());

-- RLS Policies for payment_events
CREATE POLICY "Users can view own payment events"
    ON public.payment_events FOR SELECT
    USING (payment_id IN (SELECT id FROM public.payments WHERE user_id = auth.uid()));

CREATE POLICY "System can manage payment events"
    ON public.payment_events FOR ALL
    USING (true);

CREATE POLICY "Admin can manage payment events"
    ON public.payment_events FOR ALL
    USING (is_admin());

-- Storage policies for QR codes bucket
CREATE POLICY "QR codes are publicly viewable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'qr-codes');

CREATE POLICY "System can upload QR codes"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'qr-codes');

CREATE POLICY "System can update QR codes"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'qr-codes');

CREATE POLICY "System can delete QR codes"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'qr-codes');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for payments updated_at
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_payments_updated_at();

-- Function to insert payment with events
CREATE OR REPLACE FUNCTION public.payments_insert(
    p_user_id UUID,
    p_direction TEXT,
    p_amount NUMERIC DEFAULT NULL,
    p_momo_number TEXT DEFAULT NULL,
    p_qr_url TEXT DEFAULT NULL,
    p_ref TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    payment_id UUID;
BEGIN
    -- Insert payment
    INSERT INTO public.payments (
        user_id, direction, amount, momo_number, qr_url, ref
    ) VALUES (
        p_user_id, p_direction, p_amount, p_momo_number, p_qr_url, p_ref
    ) RETURNING id INTO payment_id;
    
    -- Insert creation event
    INSERT INTO public.payment_events (payment_id, event_type, payload)
    VALUES (payment_id, 'created', jsonb_build_object(
        'direction', p_direction,
        'amount', p_amount,
        'momo_number', p_momo_number
    ));
    
    RETURN payment_id;
END;
$$;

-- Function to mark payment as paid
CREATE OR REPLACE FUNCTION public.payments_mark_paid(
    p_payment_id UUID,
    p_confirmation_note TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update payment status
    UPDATE public.payments 
    SET status = 'paid', updated_at = now()
    WHERE id = p_payment_id AND status = 'pending';
    
    -- Check if update was successful
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Insert paid event
    INSERT INTO public.payment_events (payment_id, event_type, payload)
    VALUES (p_payment_id, 'paid', jsonb_build_object(
        'confirmation_note', p_confirmation_note,
        'paid_at', now()
    ));
    
    RETURN TRUE;
END;
$$;

-- Function to generate payment reference
CREATE OR REPLACE FUNCTION public.generate_payment_ref() RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN 'EM' || TO_CHAR(NOW(), 'YYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$;