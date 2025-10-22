import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

type AuthState = {
  session: Session | null;
  status: 'idle' | 'loading' | 'authenticated';
  setSession: (session: Session | null) => void;
  setStatus: (status: AuthState['status']) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  status: 'idle',
  setSession: (session) => set({ session, status: session ? 'authenticated' : 'idle' }),
  setStatus: (status) => set({ status }),
}));
