import { supabase } from '@/integrations/supabase/client';

const resolveFunctionsBaseUrl = () => {
  const base =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    '';
  return base.replace(/\/$/, '');
};

const TELEMETRY_ENDPOINT = resolveFunctionsBaseUrl()
  ? `${resolveFunctionsBaseUrl()}/functions/v1/telemetry-sync`
  : '';

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function syncTelemetry(payload: { orgSlug: string; periodStart?: string; periodEnd?: string }) {
  if (!TELEMETRY_ENDPOINT) {
    throw new Error('Supabase URL is not configured');
  }
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(TELEMETRY_ENDPOINT, {
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
    throw new Error(json?.error ?? 'Telemetry sync failed');
  }

  return json as {
    coverage: Array<{ module: string; metric: string; measured_value: number; population: number }>;
    sla: { module: string; workflow_event: string; status: string; open_breaches: number };
    webCache: {
      retentionDays: number;
      status: 'EMPTY' | 'HEALTHY' | 'STALE';
      metrics: {
        totalRows: number;
        totalBytes: number;
        totalChars: number;
        fetchedLast24h: number;
        usedLast24h: number;
        newestFetch: string | null;
        oldestFetch: string | null;
        newestUse: string | null;
        oldestUse: string | null;
      };
    };
  };
}
