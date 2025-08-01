/**
 * RPC handler in Deno to upsert a user record via Edge Function
 */
import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const { phone } = await req.json().catch(() => ({}));
  if (!phone) return new Response('Bad Request', { status: 400 });

  const { data, error } = await supabase
    .from('users')
    .upsert({ phone_number: phone }, { onConflict: 'phone_number' })
    .select('id')
    .single();
  if (error || !data) return new Response(error?.message || 'Error', { status: 500 });
  return new Response(JSON.stringify({ id: data.id }), { status: 200 });
});
