import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTasks,
  createTask,
  updateTask,
  type TaskRecord,
  type CreateTaskInput,
  type UpdateTaskInput,
} from '@/services/tasks.service';

export function useTasks(orgId?: string | null) {
  return useQuery<TaskRecord[]>({
    queryKey: ['tasks', orgId ?? 'all'],
    queryFn: () => getTasks(orgId),
    enabled: Boolean(orgId),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onSuccess: (task) => {
      queryClient.setQueryData<TaskRecord[]>(
        ['tasks', task.orgId],
        (previous = []) => [task, ...previous.filter((item) => item.id !== task.id)],
      );
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTaskInput) => updateTask(input),
    onSuccess: (task) => {
      queryClient.setQueryData<TaskRecord[]>(
        ['tasks', task.orgId],
        (previous = []) => previous.map((item) => (item.id === task.id ? task : item)),
      );
    },
  });
}

export type { TaskRecord } from '@/services/tasks.service';
