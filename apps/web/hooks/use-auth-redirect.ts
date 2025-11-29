'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/features/auth/auth-provider';

export function useRequireAuth(redirectTo: string = '/login') {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.push(redirectTo);
    }
  }, [session, isLoading, router, redirectTo]);

  return { session, isLoading };
}

export function useRedirectIfAuthenticated(redirectTo: string = '/dashboard') {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && session) {
      router.push(redirectTo);
    }
  }, [session, isLoading, router, redirectTo]);

  return { session, isLoading };
}
