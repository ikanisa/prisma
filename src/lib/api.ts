import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';

export async function getAccessToken(): Promise<string> {
  if (!isSupabaseConfigured) {
    return 'demo-access-token';
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('User session not found. Please sign in again.');
  }
  return token;
}

const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL;

export async function authorizedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const accessToken = await getAccessToken();

  const target = (() => {
    if (/^https?:/i.test(path)) {
      return path;
    }
    if (DEFAULT_API_BASE) {
      const base = DEFAULT_API_BASE.replace(/\/$/, '');
      return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
    }
    return path;
  })();

  const headers = new Headers(options.headers ?? {});
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const hasBody = options.body !== undefined && !(options.body instanceof FormData);
  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(target, { ...options, headers });
}

export const API_BASE_URL = DEFAULT_API_BASE ?? '';
