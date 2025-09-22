-- Create payments_insert RPC function for safe payment creation
CREATE OR REPLACE FUNCTION payments_insert(
  p_user_id UUID,
  p_amount NUMERIC,
  p_momo_number TEXT,
  p_qr_url TEXT,
  p_ref TEXT,
  p_ussd_code TEXT,
  p_purpose TEXT DEFAULT 'payment'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_id UUID;
BEGIN
  INSERT INTO payments (
    user_id,
    amount,
    momo_code,
    qr_code_url,
    ref,
    ussd_code,
    purpose
  ) VALUES (
    p_user_id,
    p_amount,
    p_momo_number,
    p_qr_url,
    p_ref,
    p_ussd_code,
    p_purpose
  )
  RETURNING id INTO payment_id;
  
  RETURN payment_id;
END;
$$;

-- Create QR codes storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qr-codes',
  'qr-codes', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;