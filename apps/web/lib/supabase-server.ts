import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/src/env.server';
import { getSupabaseServiceRoleKey } from '../../../lib/secrets';
import { createSupabaseStub } from './supabase/stub';

let cachedClient: SupabaseClient | null = null;
let cachedKey: string | null = null;
let cachedUrl: string | null = null;

export async function getServiceSupabaseClient(): Promise<SupabaseClient> {
  if (env.SUPABASE_ALLOW_STUB) {
    if (!cachedClient) {
      cachedClient = createSupabaseStub();
    }
    return cachedClient;
  }

  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
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
