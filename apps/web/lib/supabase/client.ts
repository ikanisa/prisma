import { createBrowserClient, type SupabaseClient } from '@supabase/ssr';

// Lazy initialization to avoid errors during SSG/build when env vars may not be set
let _client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  // Return cached client if available
  if (_client) return _client;
  
  // During SSR/build, return a dummy that will be replaced on client
  if (typeof window === 'undefined') {
    // Return a proxy that throws helpful errors if used during SSR
    return new Proxy({} as SupabaseClient, {
      get(_, prop) {
        if (prop === 'then') return undefined; // Not a promise
        throw new Error(
          `Supabase client cannot be used during server-side rendering. ` +
          `Wrap your Supabase calls in useEffect or ensure they only run on the client.`
        );
      }
    });
  }
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
  
  _client = createBrowserClient(url, key);
  return _client;
}
