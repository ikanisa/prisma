import 'server-only';

import { getSupabaseServiceRoleKey } from '@/lib/secrets';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function invokeCitFunction<T>(path: string, payload: unknown): Promise<T> {
  if (!SUPABASE_URL) {
    return {} as T;
  }

  let serviceRoleKey: string;
  try {
    serviceRoleKey = await getSupabaseServiceRoleKey();
  } catch {
    return {} as T;
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/tax-mt-cit${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(json?.error ?? 'Tax function invocation failed');
  }

  return json as T;
}
