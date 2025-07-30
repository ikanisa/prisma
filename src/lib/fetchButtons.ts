import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ijblirphkrrsnxazohwt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const sb = createClient(supabaseUrl, supabaseKey);

export async function fetchButtons(domain: string, limit: number = 10) {
  const { data } = await sb
    .from('action_buttons')
    .select('label,payload')
    .eq('domain', domain)
    .limit(limit);
  return data ?? [];
}