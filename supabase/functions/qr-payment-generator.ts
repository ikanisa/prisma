import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';

// Supabase Authenticated client via environment variables
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const payload = await req.json().catch(() => null);
  if (!payload) {
    return new Response('Bad Request', { status: 400 });
  }
  const { user_id, amount, currency } = payload;
  try {
    // Invoke RPC to create MoMo payment + QR
    const { data, error } = await supabase.rpc('create_momo_payment_link', {
      in_user_id: user_id,
      in_amount: amount,
      in_currency: currency ?? 'RWF'
    });
    if (error) throw error;
    const { payment_ref, ussd_string } = (data as any)[0];

    // Fetch the generated QR URL
    const { data: row, error: selErr } = await supabase
      .from('payments')
      .select('qr_png_url')
      .eq('reference', payment_ref)
      .single();
    if (selErr) throw selErr;

    return new Response(
      JSON.stringify({
        payment_ref,
        ussd_string,
        qr_url: row.qr_png_url
      }),
      { status: 200 }
    );
  } catch (err: any) {
    return new Response(err.message || 'Internal Error', { status: 500 });
  }
});
