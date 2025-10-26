'use client';

import { useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useSupabaseAuth } from '@/src/features/auth/hooks/use-supabase-auth';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string, captchaToken?: string | null) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  sendMagicLink: (email: string, captchaToken?: string | null) => Promise<{ error?: string }>;
}

export function useAuth(): AuthState {
  const { session, status, signInWithOtp, signOut } = useSupabaseAuth();

  const sendMagicLink = useCallback(
    async (email: string) => {
      await signInWithOtp(email);
      return {};
    },
    [signInWithOtp],
  );

  return {
    user: session?.user ?? null,
    session,
    loading: status === 'loading',
    signIn: async () => ({ error: 'not_supported' }),
    signUp: async () => ({ error: 'not_supported' }),
    signOut,
    sendMagicLink,
  };
}
