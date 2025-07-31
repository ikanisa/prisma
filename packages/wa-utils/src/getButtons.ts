/**
 * For Node.js environment support of process.env.
 */
/**
 * Environment access for Deno and Node.
 */
declare const Deno: { env: { get(key: string): string | undefined } };
declare const process: { env: Record<string, string | undefined> };
import { createClient } from '@supabase/supabase-js';

/**
 * Retrieve up to 3 WhatsApp reply buttons for a given domain and intent.
 * @param domain Business domain (e.g. 'transport', 'payments')
 * @param intent Intent name (e.g. 'book_ride', 'check_balance')
 */
export async function getButtons(
  domain: string,
  intent: string
): Promise<Array<{ type: 'reply'; reply: { id: string; title: string } }>> {
  const supabaseUrl =
    typeof Deno !== 'undefined'
      ? Deno.env.get('SUPABASE_URL')!
      : process.env.SUPABASE_URL!;
  const supabaseKey =
    typeof Deno !== 'undefined'
      ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      : process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('whatsapp_action_buttons')
    .select('id, title')
    .eq('domain', domain)
    .eq('intent', intent)
    .order('priority', { ascending: true })
    .limit(3);

  if (error) {
    console.error('Error fetching action buttons:', error);
    return [];
  }

  return (
    data?.map((btn) => ({
      type: 'reply',
      reply: { id: btn.id, title: btn.title },
    })) ?? []
  );
}
