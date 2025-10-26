'use client';

import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const resolveClient = (): SupabaseClient => supabase;

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
