'use client';

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { clientEnv } from '@/src/env.client';

let browserClient: SupabaseClient | null = null;

const resolveClient = (): SupabaseClient => {
  if (!browserClient) {
    browserClient = createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
};

export const getSupabaseClient = resolveClient;

export const getCurrentSession = async (): Promise<Session | null> => {
  const client = resolveClient();
  const { data } = await client.auth.getSession();
  return data.session ?? null;
};

export const signInWithOtp = async (email: string) => {
  const client = resolveClient();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
    },
  });
  if (error) throw new Error(error.message);
};

export const signOut = async () => {
  const client = resolveClient();
  const { error } = await client.auth.signOut();
  if (error) throw new Error(error.message);
};

export type { SupabaseClient };
