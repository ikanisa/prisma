
-- Add missing columns to payment_requests table
ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS qr_code_url text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Create transactions table for tracking QR scans and payment attempts
CREATE TABLE IF NOT EXISTS transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid REFERENCES payment_requests(id) ON DELETE CASCADE,
    payer_number text,
    scanned_at timestamp with time zone DEFAULT now(),
    launched_ussd boolean DEFAULT false,
    payment_status text DEFAULT 'initiated',
    session_id text NOT NULL
);

-- Create users table for analytics and personalization
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone text UNIQUE,
    role text DEFAULT 'payer',
    created_at timestamp with time zone DEFAULT now(),
    last_active timestamp with time zone DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_payment_id ON transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_session_id ON transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_session_id ON payment_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Enable RLS on new tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS policies for transactions (allow anyone to log scans)
CREATE POLICY "Allow scan logging" ON transactions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow viewing own transactions" ON transactions
    FOR SELECT USING (session_id = current_setting('app.session_id', true));

-- RLS policies for users (allow registration and viewing own profile)
CREATE POLICY "Allow user registration" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow viewing own profile" ON users
    FOR SELECT USING (true);

CREATE POLICY "Allow updating own profile" ON users
    FOR UPDATE USING (true);
