import { useQuery } from '@tanstack/react-query';
import { getTasks, type TaskRecord } from '@/services/tasks.service';

export function useTasks(orgId?: string | null) {
  return useQuery<TaskRecord[]>({
    queryKey: ['tasks', orgId ?? 'all'],
    queryFn: () => getTasks(orgId),
    enabled: Boolean(orgId),
  });
}

export type { TaskRecord } from '@/services/tasks.service';
