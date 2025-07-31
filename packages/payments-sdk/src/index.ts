import { createClient, PostgrestError } from '@supabase/supabase-js';

// Initialize via environment variables
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Generate a MoMo QR payment (RWF) and return QR URL, USSD string, and reference
 */
export async function createQr(
  user_id: string,
  amount: number,
  currency: string = 'RWF'
): Promise<{ qr_url: string; ussd_string: string; payment_ref: string }> {
  const { data, error } = await supabase.rpc('create_momo_payment_link', {
    in_user_id: user_id,
    in_amount: amount,
    in_currency: currency
  });
  if (error) throw error;
  const { payment_ref, ussd_string } = (data as any)[0];
  const { data: row, error: selErr } = await supabase
    .from('payments')
    .select('qr_png_url')
    .eq('reference', payment_ref)
    .single();
  if (selErr) throw selErr;
  return { qr_url: row.qr_png_url!, ussd_string, payment_ref };
}

/**
 * Preset payment shortcuts for common amounts
 */
export function payPreset(
  user_id: string,
  presetAmount: number
): Promise<{ qr_url: string; ussd_string: string; payment_ref: string }> {
  return createQr(user_id, presetAmount);
}

/**
 * Placeholder for P2P payment flow (not implemented)
 */
export async function sendMoney(
  user_id: string,
  amount: number,
  recipient_phone: string
): Promise<void> {
  throw new Error('sendMoney not implemented');
}
