import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../src/integrations/supabase/types';

type DatabaseClient = SupabaseClient<Database>;

let cachedClient: DatabaseClient | null = null;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be defined for specialist endpoints`);
  }
  return value;
}

export function getSupabaseServiceClient(): DatabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const url = getEnv('SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  cachedClient = createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}

export type { Database };
