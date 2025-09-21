import { authorizedFetch } from '@/lib/api';

export interface NonAuditServiceSelection {
  service: string;
  prohibited: boolean;
  description?: string | null;
}

export type IndependenceConclusion = 'OK' | 'PROHIBITED' | 'OVERRIDE';

export interface EngagementRecord {
  id: string;
  org_id: string;
  client_id: string;
  title: string;
  description: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  is_audit_client: boolean;
  requires_eqr: boolean;
  non_audit_services: NonAuditServiceSelection[];
  independence_checked: boolean;
  independence_conclusion: IndependenceConclusion;
  independence_conclusion_note: string | null;
  created_at: string;
  updated_at: string | null;
}

function sanitizeNonAuditServices(input: unknown): NonAuditServiceSelection[] {
  if (!Array.isArray(input)) return [];
  const services: NonAuditServiceSelection[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const service = typeof record.service === 'string' ? record.service : '';
    if (!service) continue;
    const prohibited = Boolean(record.prohibited);
    const description = typeof record.description === 'string' ? record.description : null;
    services.push({ service, prohibited, description });
    if (services.length >= 100) break;
  }
  return services;
}

function mapEngagementRecord(row: any): EngagementRecord {
  return {
    id: row.id,
    org_id: row.org_id,
    client_id: row.client_id,
    title: row.title,
    description: row.description ?? null,
    status: row.status ?? 'PLANNING',
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? null,
    budget: typeof row.budget === 'number' ? row.budget : row.budget !== null ? Number(row.budget) : null,
    is_audit_client: Boolean(row.is_audit_client),
    requires_eqr: Boolean(row.requires_eqr),
    non_audit_services: sanitizeNonAuditServices(row.non_audit_services),
    independence_checked: Boolean(row.independence_checked),
    independence_conclusion:
      typeof row.independence_conclusion === 'string'
        ? (row.independence_conclusion as IndependenceConclusion)
        : 'OK',
    independence_conclusion_note: row.independence_conclusion_note ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
  };
}

export async function listEngagements(orgSlug: string, page = 1, pageSize = 50): Promise<EngagementRecord[]> {
  const params = new URLSearchParams({
    orgSlug,
    limit: String(pageSize),
    offset: String((page - 1) * pageSize),
  });

  const response = await authorizedFetch(`/v1/engagements?${params.toString()}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to fetch engagements');
  }
  const rows = Array.isArray(payload.engagements) ? payload.engagements : [];
  return rows.map((row: any) => mapEngagementRecord(row));
}

interface CreateEngagementPayload {
  orgSlug: string;
  clientId: string;
  title: string;
  description?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budget?: number | null;
  independence?: {
    isAuditClient: boolean;
    requiresEqr?: boolean;
    nonAuditServices: NonAuditServiceSelection[];
    independenceChecked: boolean;
    overrideNote?: string | null;
  };
}

const toNullable = (value: string | null | undefined) => {
  const trimmed = (value ?? '').trim();
  return trimmed.length === 0 ? null : trimmed;
};

export async function createEngagement(payload: CreateEngagementPayload): Promise<EngagementRecord> {
  const independence = payload.independence;
  const response = await authorizedFetch('/v1/engagements', {
    method: 'POST',
    body: JSON.stringify({
      orgSlug: payload.orgSlug,
      clientId: payload.clientId,
      title: payload.title,
      description: toNullable(payload.description ?? null),
      status: payload.status ?? 'PLANNING',
      startDate: toNullable(payload.startDate ?? null),
      endDate: toNullable(payload.endDate ?? null),
      budget: payload.budget ?? null,
      isAuditClient: independence?.isAuditClient ?? false,
      requiresEqr: independence?.requiresEqr ?? false,
      nonAuditServices: independence?.nonAuditServices ?? [],
      independenceChecked: independence?.independenceChecked ?? false,
      overrideNote: independence?.overrideNote ?? null,
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? 'Failed to create engagement');
  }

  return mapEngagementRecord(body.engagement);
}

interface UpdateEngagementPayload {
  orgSlug: string;
  engagementId: string;
  clientId?: string;
  title?: string;
  description?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budget?: number | null;
  independence?: {
    isAuditClient?: boolean;
    requiresEqr?: boolean;
    nonAuditServices?: NonAuditServiceSelection[];
    independenceChecked?: boolean;
    overrideNote?: string | null;
  };
}

export async function updateEngagement(payload: UpdateEngagementPayload): Promise<EngagementRecord> {
  const independence = payload.independence;
  const response = await authorizedFetch(`/v1/engagements/${payload.engagementId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      orgSlug: payload.orgSlug,
      clientId: payload.clientId,
      title: payload.title,
      description: typeof payload.description === 'undefined' ? undefined : toNullable(payload.description),
      status: payload.status,
      startDate: typeof payload.startDate === 'undefined' ? undefined : toNullable(payload.startDate),
      endDate: typeof payload.endDate === 'undefined' ? undefined : toNullable(payload.endDate),
      budget: payload.budget ?? undefined,
      isAuditClient: independence?.isAuditClient,
      requiresEqr: independence?.requiresEqr,
      nonAuditServices: independence?.nonAuditServices,
      independenceChecked: independence?.independenceChecked,
      overrideNote: typeof independence?.overrideNote === 'undefined' ? undefined : independence.overrideNote,
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? 'Failed to update engagement');
  }

  return mapEngagementRecord(body.engagement);
}

export async function deleteEngagement(orgSlug: string, engagementId: string): Promise<void> {
  const params = new URLSearchParams({ orgSlug });
  const response = await authorizedFetch(`/v1/engagements/${engagementId}?${params.toString()}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? 'Failed to delete engagement');
  }
}
