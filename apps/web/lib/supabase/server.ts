import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/src/env.server';
import { createSupabaseStub } from './stub';
import type { Database } from '@prisma-glow/platform/supabase/types';

type DatabaseClient = SupabaseClient<Database>;

let cachedClient: DatabaseClient | null = null;
const SUPABASE_ALLOW_STUB = env.SUPABASE_ALLOW_STUB;

/**
 * Lazily instantiate a Supabase Service Role client (server-side only).
 * Reuses a single cached instance across calls.
 */
export function getSupabaseServiceClient(): DatabaseClient {
  if (cachedClient) return cachedClient;

  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    if (!SUPABASE_ALLOW_STUB) {
      throw new Error('Supabase service credentials are not configured');
    }
    cachedClient = createSupabaseStub();
    return cachedClient;
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}

/**
 * Backward-compatible alias for main branch usage.
 */
export function getSupabaseServerClient(): DatabaseClient {
  return getSupabaseServiceClient();
}

export type SupabaseServerClient = ReturnType<typeof getSupabaseServerClient>;
