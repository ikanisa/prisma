'use client';

import type { ReactNode } from 'react';
import { useSupabaseAuth } from '../hooks/use-supabase-auth';

export function SupabaseSessionBridge({ children }: { children: ReactNode }) {
  useSupabaseAuth();
  return <>{children}</>;
}
