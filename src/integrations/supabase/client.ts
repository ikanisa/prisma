import { createClient } from '@supabase/supabase-js';
import { Store } from 'tauri-plugin-store-api';
import type { Database } from './types';
import { logger } from '@/lib/logger';
import {
  isSupabaseRuntimeConfigured,
  resolvedSupabaseAnonKey,
  resolvedSupabaseUrl,
  runtimeConfig,
} from '@/lib/runtime-config';

type ExtendedDatabase = Database & {
// ... (rest of type definition)
};

export const isSupabaseConfigured = isSupabaseRuntimeConfigured;

if (!isSupabaseConfigured) {
  if (import.meta.env.MODE === 'production') {
    throw new Error(
      'Supabase environment variables are not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY before building for production.',
    );
  }

  if (typeof window !== 'undefined') {
    logger.warn('supabase.config_missing_demo_mode');
  }
}

// Custom storage adapter for Tauri
let customStorage: any;

if (typeof window !== 'undefined' && '__TAURI__' in window) {
  try {
    const store = new Store('.auth.dat');

    customStorage = {
      getItem: async (key: string) => {
        return (await store.get(key)) as string | null;
      },
      setItem: async (key: string, value: string) => {
        await store.set(key, value);
        await store.save();
      },
      removeItem: async (key: string) => {
        await store.delete(key);
        await store.save();
      },
    };
  } catch (e) {
    console.warn('Failed to load Tauri store, falling back to localStorage', e);
  }
}

export const supabase = createClient<ExtendedDatabase>(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
  auth: {
    storage: customStorage || (typeof window !== 'undefined' ? window.localStorage : undefined),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: runtimeConfig.supabaseSchema ?? 'public',
  },
});

