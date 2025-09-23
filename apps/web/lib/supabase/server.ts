import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../src/integrations/supabase/types';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase service credentials are not configured for the web app.');
}

const supabaseServerClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});

export function getSupabaseServerClient() {
  return supabaseServerClient;
}

export type SupabaseServerClient = ReturnType<typeof getSupabaseServerClient>;
