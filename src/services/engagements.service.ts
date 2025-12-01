import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAppStore } from '@/stores/mock-data';

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
    const appStore = useAppStore.getState();
    return appStore.getOrgEngagements(orgId) as EngagementRecord[];
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
