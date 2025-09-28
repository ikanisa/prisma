import { authorizedFetch } from '@/lib/api';

export interface TaskRecord {
  id: string;
  org_id: string;
  engagement_id: string | null;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ListTasksParams {
  orgSlug: string;
  page?: number;
  pageSize?: number;
  status?: TaskRecord['status'] | 'all';
}

export async function listTasks({ orgSlug, page = 1, pageSize = 20, status }: ListTasksParams): Promise<TaskRecord[]> {
  const params = new URLSearchParams({
    orgSlug,
    limit: String(pageSize),
    offset: String((page - 1) * pageSize),
  });

  if (status && status !== 'all') {
    params.set('status', status);
  }

  const response = await authorizedFetch(`/v1/tasks?${params.toString()}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to fetch tasks');
  }
  return (payload.tasks ?? []) as TaskRecord[];
}

interface CreateTaskPayload {
  orgSlug: string;
  title: string;
  description?: string | null;
  status?: TaskRecord['status'];
  priority?: TaskRecord['priority'];
  engagementId?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
}

export async function createTask(payload: CreateTaskPayload): Promise<TaskRecord> {
  const response = await authorizedFetch('/v1/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? 'Failed to create task');
  }
  return body.task as TaskRecord;
}

interface UpdateTaskPayload {
  status?: TaskRecord['status'];
  priority?: TaskRecord['priority'];
  assigneeId?: string | null;
  engagementId?: string | null;
  dueDate?: string | null;
  title?: string;
  description?: string | null;
}

export async function updateTask(taskId: string, updates: UpdateTaskPayload): Promise<TaskRecord> {
  const response = await authorizedFetch(`/v1/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? 'Failed to update task');
  }
  return body.task as TaskRecord;
}
