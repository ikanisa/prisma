import { authorizedFetch } from '@/lib/api';

export interface ClientRecord {
  id: string;
  org_id: string;
  name: string;
  industry: string | null;
  status: string | null;
  primary_contact: string | null;
  last_engagement_at: string | null;
  created_at: string;
  updated_at: string | null;
}

function mapClient(row: any): ClientRecord {
  return {
    id: String(row.id ?? ''),
    org_id: String(row.org_id ?? ''),
    name: typeof row.name === 'string' ? row.name : 'Unknown client',
    industry: typeof row.industry === 'string' ? row.industry : null,
    status: typeof row.status === 'string' ? row.status : null,
    primary_contact: typeof row.primary_contact === 'string' ? row.primary_contact : null,
    last_engagement_at: typeof row.last_engagement_at === 'string' ? row.last_engagement_at : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}

export async function listClients(orgSlug: string, limit = 200, offset = 0): Promise<ClientRecord[]> {
  const params = new URLSearchParams({
    orgSlug,
    limit: String(limit),
    offset: String(offset),
  });
  const response = await authorizedFetch(`/v1/clients?${params.toString()}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string }).error ?? 'Failed to fetch clients');
  }
  const rows = Array.isArray((payload as { clients?: unknown }).clients)
    ? ((payload as { clients: unknown[] }).clients)
    : [];

  return rows.map(mapClient);
}
