import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseServiceRoleKey } from '@prisma-glow/lib/secrets';
import { createSupabaseStub } from '../web/lib/supabase/stub';

let cachedClient: SupabaseClient | null = null;
let cachedKey: string | null = null;
let cachedUrl: string | null = null;

export async function getServiceSupabaseClient(): Promise<SupabaseClient> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    if (!cachedClient) {
      cachedClient = createSupabaseStub();
    }
    return cachedClient;
  }

  let serviceRoleKey: string;
  try {
    serviceRoleKey = await getSupabaseServiceRoleKey();
  } catch {
    if (!cachedClient) {
      cachedClient = createSupabaseStub();
    }
    return cachedClient;
  }

  if (!cachedClient || cachedKey !== serviceRoleKey || cachedUrl !== url) {
    cachedClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
    cachedKey = serviceRoleKey;
    cachedUrl = url;
  }

  return cachedClient;
}
