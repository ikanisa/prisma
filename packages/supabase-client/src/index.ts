import { createClient } from '@supabase/supabase-js';
import type { Database } from '@prisma-glow/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'x-client-info': 'prisma-glow-pwa',
    },
  },
});

// Auth helpers
export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

export const signUp = async (email: string, password: string) => {
  return await supabase.auth.signUp({ email, password });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const getSession = async () => {
  return await supabase.auth.getSession();
};

export const getUser = async () => {
  return await supabase.auth.getUser();
};

// Database helpers with RLS
export const createRecord = async <T extends keyof Database['public']['Tables']>(
  table: T,
  data: Database['public']['Tables'][T]['Insert']
) => {
  return await supabase.from(table).insert(data).select().single();
};

export const updateRecord = async <T extends keyof Database['public']['Tables']>(
  table: T,
  id: string,
  data: Database['public']['Tables'][T]['Update']
) => {
  return await supabase.from(table).update(data).eq('id', id).select().single();
};

export const deleteRecord = async <T extends keyof Database['public']['Tables']>(
  table: T,
  id: string
) => {
  return await supabase.from(table).delete().eq('id', id);
};

export const getRecords = async <T extends keyof Database['public']['Tables']>(
  table: T,
  options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    ascending?: boolean;
  }
) => {
  let query = supabase.from(table).select();

  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  if (options?.orderBy) query = query.order(options.orderBy, { ascending: options.ascending ?? true });

  return await query;
};

// Realtime subscriptions
export const subscribeToTable = <T extends keyof Database['public']['Tables']>(
  table: T,
  callback: (payload: any) => void
) => {
  return supabase
    .channel(`public:${table}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: table as string },
      callback
    )
    .subscribe();
};
