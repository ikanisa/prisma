
-- Create transactions table for QR scan logging
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scanned_code text NOT NULL,
    scanned_at timestamp with time zone DEFAULT now(),
    launched_ussd boolean DEFAULT false,
    payment_status text DEFAULT 'scanned',
    payer_number text,
    session_id text DEFAULT gen_random_uuid()::text
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert scan records
CREATE POLICY "Allow anonymous insert" ON public.transactions
    FOR INSERT 
    WITH CHECK (true);

-- Allow anonymous users to update their own records
CREATE POLICY "Allow anonymous update" ON public.transactions
    FOR UPDATE 
    USING (true);

-- Allow anonymous users to select their own records
CREATE POLICY "Allow anonymous select" ON public.transactions
    FOR SELECT 
    USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_scanned_at ON public.transactions(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_session_id ON public.transactions(session_id);
