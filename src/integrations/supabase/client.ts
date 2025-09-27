import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const envSupabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const isPlaceholder = (value?: string) =>
  !value || value.startsWith('REPLACE_WITH_') || value.includes('your_project_id');

const SUPABASE_URL = envSupabaseUrl ?? '';
const SUPABASE_ANON_KEY = envSupabaseAnonKey ?? '';

export const isSupabaseConfigured = Boolean(
  !isPlaceholder(envSupabaseUrl) && !isPlaceholder(envSupabaseAnonKey),
);

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.warn(
    '[Aurora] Supabase environment keys are missing. Running in demo mode with local data only.',
  );
}

const FALLBACK_SUPABASE_URL = isSupabaseConfigured ? SUPABASE_URL : 'https://demo.invalid.supabase.co';
const FALLBACK_SUPABASE_KEY = isSupabaseConfigured ? SUPABASE_ANON_KEY : 'public-anon-demo-key';

export const supabase = createClient<Database>(FALLBACK_SUPABASE_URL, FALLBACK_SUPABASE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
