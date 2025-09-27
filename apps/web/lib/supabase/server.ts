import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type DatabaseClient = SupabaseClient<Database>;

let cachedClient: DatabaseClient | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be defined for Supabase server client`);
  }
  return value;
}

/**
 * Lazily instantiate a Supabase Service Role client (server-side only).
 * Reuses a single cached instance across calls.
 */
export function getSupabaseServiceClient(): DatabaseClient {
  if (cachedClient) return cachedClient;

  const url = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  cachedClient = createClient<Database>(url, serviceRoleKey, {
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

export type { Database };
export type SupabaseServerClient = ReturnType<typeof getSupabaseServerClient>;
