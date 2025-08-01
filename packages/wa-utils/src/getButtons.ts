import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Reply button shape for WhatsApp Business API */
export interface ReplyButton {
  type: 'reply';
  reply: { id: string; title: string };
}

let supabase: SupabaseClient;
/**
 * Initialize Supabase client. Call once before using getButtons.
 */
export function initSupabase(url: string, key: string) {
  supabase = createClient(url, key);
}

/**
 * Fetch up to 3 reply buttons for given domain & intent, ordered by priority.
 */
export async function getButtons(
  domain: string,
  intent: string
): Promise<ReplyButton[]> {
  if (!supabase) throw new Error('Supabase client not initialized');
  const { data, error } = await supabase
    .from('whatsapp_action_buttons')
    .select('button_id, title, priority')
    .eq('domain', domain)
    .eq('intent', intent)
    .order('priority', { ascending: false })
    .limit(3);
  if (error) throw error;
  return (data || []).map((row) => ({
    type: 'reply',
    reply: { id: row.button_id, title: row.title }
  }));
}
