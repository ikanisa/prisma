import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://xzwowkxzgqigfuefmaji.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6d293a3h6Z3FpZ2Z1ZWZtYWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NzUzNDEsImV4cCI6MjA3MTM1MTM0MX0.tg1qX-dse9sYvj23BRwd7Znt0sbVpnRV7ggGCxvWjgI";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
