import { supabase } from '@/integrations/supabase/client';
import { getSupabaseFunctionBaseUrl } from '@/lib/supabase-functions';

const ERROR_ENDPOINT = getSupabaseFunctionBaseUrl('error-notify');

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
