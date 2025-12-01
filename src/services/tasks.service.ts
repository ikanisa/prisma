import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAppStore } from '@/stores/mock-data';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskRecord {
  id: string;
  orgId: string;
  engagementId: string | null;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  assigneeId?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
}

type TaskRow = Database['public']['Tables']['tasks']['Row'];

const friendlyId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
};

const normalizeStatus = (status?: string | null): TaskStatus => {
  const value = status?.toUpperCase() as TaskStatus | undefined;
  if (value === 'IN_PROGRESS' || value === 'REVIEW' || value === 'COMPLETED' || value === 'TODO') {
    return value;
  }
  return 'IN_PROGRESS';
};

const normalizePriority = (priority?: string | null): TaskPriority => {
  const value = priority?.toUpperCase() as TaskPriority | undefined;
  if (value === 'LOW' || value === 'MEDIUM' || value === 'HIGH' || value === 'URGENT') {
    return value;
  }
  return 'MEDIUM';
};

const mapTaskRow = (row: TaskRow): TaskRecord => ({
  id: row?.id ?? friendlyId(),
  orgId: (row as any)?.org_id ?? '',
  engagementId: (row as any)?.engagement_id ?? null,
  title: row?.title ?? '',
  description: row?.description ?? null,
  dueDate: row?.due_date ?? null,
  assigneeId: (row as any)?.assigned_to ?? null,
  status: normalizeStatus(row?.status),
  priority: normalizePriority(row?.priority),
  createdAt: row?.created_at ?? new Date().toISOString(),
});

export async function getTasks(orgId?: string | null): Promise<TaskRecord[]> {
  if (!orgId) {
    return [];
  }

  if (!isSupabaseConfigured) {
    const appStore = useAppStore.getState();
    return appStore.getOrgTasks(orgId) as TaskRecord[];
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapTaskRow);
}
