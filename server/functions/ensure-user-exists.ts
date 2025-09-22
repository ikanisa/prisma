import { createClient } from '@supabase/supabase-js';
import { env } from '../utils/env';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Upsert a user by phone number and return the user record.
 * Throws if upsert fails.
 */
export async function ensureUserExists(phone: string): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('users')
    .upsert({ phone_number: phone }, { onConflict: 'phone_number' })
    .select('id')
    .single();
  if (error || !data) {
    throw error ?? new Error(`Failed to upsert user: ${phone}`);
  }
  return data;
}
