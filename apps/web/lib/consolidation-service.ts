import { supabase } from '@/integrations/supabase/client';

const resolveFunctionsBaseUrl = () => {
  const base =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    '';
  return base.replace(/\/$/, '');
};

const FUNCTIONS_BASE_URL = resolveFunctionsBaseUrl()
  ? `${resolveFunctionsBaseUrl()}/functions/v1/consolidation`
  : '';

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!FUNCTIONS_BASE_URL) {
    throw new Error('Supabase URL is not configured');
  }
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${FUNCTIONS_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(json?.error ?? 'Request failed');
  }

  return json as T;
}

export function runConsolidation(payload: Record<string, unknown>) {
  return request<{ consolidationId: string }>(`/run`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listConsolidations(payload: { orgSlug: string }) {
  return request<{ items: Array<Record<string, unknown>> }>(`/list`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
