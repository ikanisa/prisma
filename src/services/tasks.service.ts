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
type AppStoreState = ReturnType<typeof useAppStore.getState>;

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

export interface CreateTaskInput {
  orgId: string;
  engagementId: string | null;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  assigneeId?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
}

export interface UpdateTaskInput {
  id: string;
  orgId: string;
  updates: Partial<CreateTaskInput>;
}

const setMockTasks = (updater: (tasks: AppStoreState['tasks']) => AppStoreState['tasks']) => {
  const store = useAppStore.getState();
  const next = updater(store.tasks);
  store.setTasks(next);
};

export async function createTask(input: CreateTaskInput): Promise<TaskRecord> {
  if (!input.orgId) {
    throw new Error('Organization is required to create a task.');
  }

  if (!isSupabaseConfigured) {
    const record: TaskRecord = {
      id: friendlyId(),
      orgId: input.orgId,
      engagementId: input.engagementId,
      title: input.title,
      description: input.description ?? null,
      dueDate: input.dueDate ?? null,
      assigneeId: input.assigneeId ?? null,
      status: input.status,
      priority: input.priority,
      createdAt: new Date().toISOString(),
    };
    setMockTasks((tasks) => [...tasks, record]);
    return record;
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      org_id: input.orgId,
      engagement_id: input.engagementId,
      title: input.title,
      description: input.description,
      due_date: input.dueDate,
      assigned_to: input.assigneeId,
      status: input.status,
      priority: input.priority,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapTaskRow(data);
}

export async function updateTask(input: UpdateTaskInput): Promise<TaskRecord> {
  if (!input.orgId || !input.id) {
    throw new Error('Task id and organization are required to update a task.');
  }

  if (!isSupabaseConfigured) {
    const next = useAppStore
      .getState()
      .tasks.map((task) =>
        task.id === input.id
          ? {
              ...task,
              ...input.updates,
            }
          : task,
      ) as AppStoreState['tasks'];
    setMockTasks(() => next);
    const updated = next.find((item) => item.id === input.id);
    if (!updated) {
      throw new Error('Task not found.');
    }
    return updated as TaskRecord;
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.updates.title !== undefined) updatePayload.title = input.updates.title;
  if (input.updates.description !== undefined) updatePayload.description = input.updates.description;
  if (input.updates.dueDate !== undefined) updatePayload.due_date = input.updates.dueDate;
  if (input.updates.assigneeId !== undefined) updatePayload.assigned_to = input.updates.assigneeId;
  if (input.updates.status !== undefined) updatePayload.status = input.updates.status;
  if (input.updates.priority !== undefined) updatePayload.priority = input.updates.priority;
  if (input.updates.engagementId !== undefined) updatePayload.engagement_id = input.updates.engagementId;

  const { data, error } = await supabase
    .from('tasks')
    .update(updatePayload)
    .eq('id', input.id)
    .eq('org_id', input.orgId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapTaskRow(data);
}
