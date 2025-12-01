import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { getDemoEngagements, setDemoEngagements } from '@/stores/mock-data';

export type EngagementType = 'ACCOUNTING' | 'AUDIT' | 'TAX';
export type EngagementStatus = 'PLANNING' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';

export interface EngagementRecord {
  id: string;
  orgId: string;
  clientId: string;
  title: string;
  type: EngagementType;
  status: EngagementStatus;
  periodStart?: string | null;
  periodEnd?: string | null;
  managerId?: string | null;
  createdAt: string;
}

type EngagementRow = Database['public']['Tables']['engagements']['Row'];

const friendlyId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
};

const mapEngagementRow = (row: EngagementRow): EngagementRecord => ({
  id: row?.id ?? friendlyId(),
  orgId: (row as any)?.org_id ?? '',
  clientId: (row as any)?.client_id ?? '',
  title: row?.title ?? '',
  type: ((row?.type ?? 'ACCOUNTING') as EngagementType) ?? 'ACCOUNTING',
  status: ((row?.status ?? 'IN_PROGRESS') as EngagementStatus) ?? 'IN_PROGRESS',
  periodStart: row?.period_start ?? (row as any)?.start_date ?? null,
  periodEnd: row?.period_end ?? (row as any)?.end_date ?? null,
  managerId: (row as any)?.manager_id ?? null,
  createdAt: row?.created_at ?? new Date().toISOString(),
});

export async function getEngagements(orgId?: string | null): Promise<EngagementRecord[]> {
  if (!orgId) {
    return [];
  }

  if (!isSupabaseConfigured) {
    return getDemoEngagements().filter((engagement) => engagement.orgId === orgId) as EngagementRecord[];
  }

  const { data, error } = await supabase
    .from('engagements')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapEngagementRow);
}

export interface CreateEngagementInput {
  orgId: string;
  clientId: string;
  title: string;
  type: EngagementType;
  status: EngagementStatus;
  periodStart: string;
  periodEnd: string;
  managerId: string;
}

export interface UpdateEngagementInput {
  id: string;
  orgId: string;
  updates: Partial<Omit<CreateEngagementInput, 'orgId'>>;
}

const setMockEngagements = (next: any) => {
  setDemoEngagements(next);
};

export async function createEngagement(input: CreateEngagementInput): Promise<EngagementRecord> {
  if (!input.orgId) {
    throw new Error('Organization is required to create an engagement.');
  }

  if (!isSupabaseConfigured) {
    const record: EngagementRecord = {
      id: friendlyId(),
      orgId: input.orgId,
      clientId: input.clientId,
      title: input.title,
      type: input.type,
      status: input.status,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      managerId: input.managerId,
      createdAt: new Date().toISOString(),
    };
    setMockEngagements([...getDemoEngagements(), record]);
    return record;
  }

  const { data, error } = await supabase
    .from('engagements')
    .insert({
      org_id: input.orgId,
      client_id: input.clientId,
      title: input.title,
      type: input.type,
      status: input.status,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      manager_id: input.managerId,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapEngagementRow(data);
}

export async function updateEngagement(input: UpdateEngagementInput): Promise<EngagementRecord> {
  if (!input.orgId || !input.id) {
    throw new Error('Engagement id and organization are required to update an engagement.');
  }

  if (!isSupabaseConfigured) {
    const next = getDemoEngagements().map((engagement) =>
      engagement.id === input.id ? { ...engagement, ...input.updates } : engagement,
    );
    setMockEngagements(next);
    const updated = next.find((item) => item.id === input.id);
    if (!updated) {
      throw new Error('Engagement not found.');
    }
    return updated as EngagementRecord;
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.updates.title !== undefined) updatePayload.title = input.updates.title;
  if (input.updates.type !== undefined) updatePayload.type = input.updates.type;
  if (input.updates.status !== undefined) updatePayload.status = input.updates.status;
  if (input.updates.periodStart !== undefined) updatePayload.period_start = input.updates.periodStart;
  if (input.updates.periodEnd !== undefined) updatePayload.period_end = input.updates.periodEnd;
  if (input.updates.clientId !== undefined) updatePayload.client_id = input.updates.clientId;
  if (input.updates.managerId !== undefined) updatePayload.manager_id = input.updates.managerId;

  const { data, error } = await supabase
    .from('engagements')
    .update(updatePayload)
    .eq('id', input.id)
    .eq('org_id', input.orgId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapEngagementRow(data);
}
