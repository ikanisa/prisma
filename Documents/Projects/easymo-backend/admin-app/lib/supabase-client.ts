import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getRuntimeEnv } from "./env";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { env, isSupabaseConfigured } = getRuntimeEnv();
  if (!isSupabaseConfigured) return null;
  if (cachedClient) return cachedClient;
  cachedClient = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  return cachedClient;
}
