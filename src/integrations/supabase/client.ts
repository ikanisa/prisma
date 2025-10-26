import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { logger } from '@/lib/logger';
import {
  isSupabaseRuntimeConfigured,
  resolvedSupabaseAnonKey,
  resolvedSupabaseUrl,
  runtimeConfig,
} from '@/lib/runtime-config';

type ExtendedDatabase = Database & {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & {
      user_profiles: {
        Row: {
          id: string;
          display_name: string;
          email: string;
          phone_e164: string | null;
          whatsapp_e164: string | null;
          whatsapp_verified: boolean;
          avatar_url: string | null;
          locale: string | null;
          timezone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          email: string;
          phone_e164?: string | null;
          whatsapp_e164?: string | null;
          whatsapp_verified?: boolean;
          avatar_url?: string | null;
          locale?: string | null;
          timezone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          email?: string;
          phone_e164?: string | null;
          whatsapp_e164?: string | null;
          whatsapp_verified?: boolean;
          avatar_url?: string | null;
          locale?: string | null;
          timezone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      mfa_challenges: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          channel: 'WHATSAPP';
          code_hash: string;
          expires_at: string;
          attempts: number;
          consumed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          channel: 'WHATSAPP';
          code_hash: string;
          expires_at: string;
          attempts?: number;
          consumed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          channel?: 'WHATSAPP';
          code_hash?: string;
          expires_at?: string;
          attempts?: number;
          consumed?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'mfa_challenges_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'mfa_challenges_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Enums: Database['public']['Enums'] & {
      mfa_channel: 'WHATSAPP';
    };
  };
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

export const supabase = createClient<ExtendedDatabase>(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: runtimeConfig.supabaseSchema ?? 'public',
  },
});
