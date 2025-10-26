'use client';

import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient, getCurrentSession, signInWithOtp, signOut } from '../supabase-auth';
import { useAuthStore } from '@/src/store/auth-store';
import { queryKeys } from '../../common/query-keys';

export function useSupabaseAuth() {
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);
  const status = useAuthStore((state) => state.status);
  const setSession = useAuthStore((state) => state.setSession);
  const setStatus = useAuthStore((state) => state.setStatus);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    void getCurrentSession()
      .then((current) => {
        if (!active) return;
        setSession(current);
        setStatus(current ? 'authenticated' : 'idle');
      })
      .catch(() => setStatus('idle'));

    const client = getSupabaseClient();
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setStatus(nextSession ? 'authenticated' : 'idle');
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.session() });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient, setSession, setStatus]);

  const handleSignIn = useCallback(async (email: string) => {
    await signInWithOtp(email);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, []);

  return {
    session,
    status,
    signInWithOtp: handleSignIn,
    signOut: handleSignOut,
  };
}
