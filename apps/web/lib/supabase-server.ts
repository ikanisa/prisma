import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/integrations/supabase/types';
import { getSupabaseServiceRoleKey } from '../../../lib/secrets';

let cachedClient: SupabaseClient<Database> | null = null;
let cachedKey: string | null = null;
let cachedUrl: string | null = null;

export async function getServiceSupabaseClient(): Promise<SupabaseClient<Database>> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('Supabase service URL is not configured. Set SUPABASE_URL.');
  }

  const serviceRoleKey = await getSupabaseServiceRoleKey();

  if (!cachedClient || cachedKey !== serviceRoleKey || cachedUrl !== url) {
    cachedClient = createClient<Database>(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
    cachedKey = serviceRoleKey;
    cachedUrl = url;
  }

  return cachedClient;
}
