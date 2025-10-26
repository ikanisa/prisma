import { supabase } from '@/integrations/supabase/client';

const resolveFunctionsBaseUrl = () => {
  const base =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    '';
  return base.replace(/\/$/, '');
};

const ERROR_ENDPOINT = resolveFunctionsBaseUrl()
  ? `${resolveFunctionsBaseUrl()}/functions/v1/error-notify`
  : '';

async function getSessionToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function notifyError(payload: {
  orgSlug: string;
  module: string;
  error: string;
  context?: Record<string, unknown>;
}) {
  if (!ERROR_ENDPOINT) {
    throw new Error('Supabase URL is not configured');
  }
  const token = await getSessionToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(ERROR_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(json?.error ?? 'Error notify failed');
  }

  return json as { success: true };
}
