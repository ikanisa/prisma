import { supabase } from '@/integrations/supabase/client';

// Legacy API functions - now using Supabase client directly
// These functions are kept for compatibility but internally use Supabase

export async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('User session not found. Please sign in again.');
  }
  return token;
}

// Note: This function is deprecated in favor of using Supabase client directly
// It's maintained for backward compatibility only
export async function authorizedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  console.warn('authorizedFetch is deprecated. Use Supabase client directly instead.');
  
  // For now, return a mock response to prevent errors
  // TODO: Replace all usages with proper Supabase client calls
  return new Response(JSON.stringify({ error: 'API endpoint not implemented' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Deprecated: Use Supabase functions URL directly if needed
export const API_BASE_URL = "https://xzwowkxzgqigfuefmaji.supabase.co/functions/v1";
