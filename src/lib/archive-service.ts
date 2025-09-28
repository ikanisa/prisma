import { supabase } from '@/integrations/supabase/client';

const ARCHIVE_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/archive-sync`;

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function syncArchive(payload: { orgSlug: string; engagementId: string }) {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(ARCHIVE_ENDPOINT, {
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
    throw new Error(json?.error ?? 'Archive sync failed');
  }

  return json as {
    manifest: {
      engagementId: string;
      generatedAt: string;
      acceptance: Record<string, unknown> | null;
      tcwg: Record<string, unknown> | null;
      modules: Array<Record<string, unknown>>;
    };
    sha256: string;
  };
}
