-- Task-10: Payments module schema and RPC for MoMo QR + USSD

-- 1. Add column for QR PNG URL
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS qr_png_url text;

-- 2. Create RPC to generate MoMo payment link and QR code
CREATE OR REPLACE FUNCTION public.create_momo_payment_link(
  in_user_id uuid,
  in_amount numeric,
  in_currency text DEFAULT 'RWF'
) RETURNS TABLE(payment_ref text, ussd_string text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  p record;
BEGIN
  -- Delegate to existing enhanced payment insert
  SELECT * INTO p
    FROM public.payments_insert_enhanced(in_user_id, in_amount, in_currency);
  -- Generate QR code and store URL
  UPDATE public.payments
    SET qr_png_url = public.generate_qr_code_svg(p.payment_ref)
    WHERE reference = p.payment_ref;
  RETURN QUERY SELECT p.payment_ref, p.ussd_string;
END;
$$;
