import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Shared Supabase client for edge/Serverless functions
// Reads connection info from environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  global: {
    headers: { 'x-supabase-admin': 'true' },
  },
  db: { schema: 'public' },
});
