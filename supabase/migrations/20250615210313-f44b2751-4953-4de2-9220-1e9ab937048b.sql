
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE payment_method AS ENUM ('number', 'code');
CREATE TYPE payment_status AS ENUM ('pending', 'sent', 'confirmed');
CREATE TYPE qr_type AS ENUM ('scan', 'generate');

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  momo_code TEXT,
  amount INTEGER NOT NULL CHECK (amount > 0),
  method payment_method NOT NULL,
  ussd_string TEXT NOT NULL,
  status payment_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create qr_history table
CREATE TABLE public.qr_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  type qr_type NOT NULL,
  ussd_string TEXT NOT NULL,
  qr_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shared_links table
CREATE TABLE public.shared_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  link_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64url'),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table for analytics
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for session-based access
CREATE POLICY "Users can access their own payments" ON public.payments
  FOR ALL USING (session_id = current_setting('app.session_id', true));

CREATE POLICY "Users can access their own QR history" ON public.qr_history
  FOR ALL USING (session_id = current_setting('app.session_id', true));

CREATE POLICY "Users can access their own shared links" ON public.shared_links
  FOR ALL USING (session_id = current_setting('app.session_id', true));

CREATE POLICY "Users can access their own events" ON public.events
  FOR ALL USING (session_id = current_setting('app.session_id', true));

-- Create shared links public access policy (for recipients)
CREATE POLICY "Public can view non-expired shared links" ON public.shared_links
  FOR SELECT USING (expires_at > NOW());

-- Create indexes for performance
CREATE INDEX idx_payments_session_id ON public.payments(session_id);
CREATE INDEX idx_qr_history_session_id ON public.qr_history(session_id);
CREATE INDEX idx_shared_links_session_id ON public.shared_links(session_id);
CREATE INDEX idx_shared_links_token ON public.shared_links(link_token);
CREATE INDEX idx_events_session_id ON public.events(session_id);

-- Create storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qr-codes', 'qr-codes', true);

-- Create storage policies
CREATE POLICY "Allow public read access to QR codes" ON storage.objects
  FOR SELECT USING (bucket_id = 'qr-codes');

CREATE POLICY "Allow authenticated upload to QR codes" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'qr-codes');

-- Create utility functions
CREATE OR REPLACE FUNCTION public.generate_ussd_string(
  input_value TEXT,
  amount INTEGER
) RETURNS TEXT AS $$
BEGIN
  -- Phone number pattern (07xxxxxxxx)
  IF input_value ~ '^07[2-9][0-9]{7}$' THEN
    RETURN '*182*1*1*' || input_value || '*' || amount || '#';
  -- Agent code pattern (4-6 digits)
  ELSIF input_value ~ '^[0-9]{4,6}$' THEN
    RETURN '*182*8*1*' || input_value || '*' || amount || '#';
  ELSE
    -- Default to phone format
    RETURN '*182*1*1*' || input_value || '*' || amount || '#';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.detect_payment_method(
  input_value TEXT
) RETURNS payment_method AS $$
BEGIN
  IF input_value ~ '^07[2-9][0-9]{7}$' THEN
    RETURN 'number'::payment_method;
  ELSIF input_value ~ '^[0-9]{4,6}$' THEN
    RETURN 'code'::payment_method;
  ELSE
    RETURN 'number'::payment_method; -- Default
  END IF;
END;
$$ LANGUAGE plpgsql;
