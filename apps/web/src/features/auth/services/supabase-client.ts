'use client';

import { create } from 'zustand';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { clientEnv } from '@/src/env.client';

type AuthStoreState = {
  client: SupabaseClient | null;
  session: Session | null;
  initializing: boolean;
  error: string | null;
  ensureClient(): SupabaseClient;
  initialize(): Promise<void>;
  signInWithOtp(email: string): Promise<void>;
  signOut(): Promise<void>;
};

const createSupabaseClient = () =>
  createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

export const useSupabaseAuth = create<AuthStoreState>((set, get) => ({
  client: null,
  session: null,
  initializing: false,
  error: null,
  ensureClient() {
    const existing = get().client;
    if (existing) return existing;
    const client = createSupabaseClient();
    set({ client });
    return client;
  },
  async initialize() {
    set({ initializing: true, error: null });
    try {
      const client = get().ensureClient();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      set({ session: data.session ?? null });
      client.auth.onAuthStateChange((_event, nextSession) => {
        set({ session: nextSession ?? null });
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to initialise Supabase auth' });
    } finally {
      set({ initializing: false });
    }
  },
  async signInWithOtp(email: string) {
    set({ error: null });
    const client = get().ensureClient();
    const { error } = await client.auth.signInWithOtp({ email: email.trim() });
    if (error) {
      set({ error: error.message });
      throw error;
    }
  },
  async signOut() {
    set({ error: null });
    const client = get().ensureClient();
    const { error } = await client.auth.signOut();
    if (error) {
      set({ error: error.message });
      throw error;
    }
  },
}));
