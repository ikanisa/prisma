import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase.js';

export interface TaskDependencyLoaderOptions {
  supabase: Pick<SupabaseClient<Database>, 'from'>;
  onBatchResolved?: (payload: { ids: string[]; completedCount: number }) => void;
  onBatchError?: (error: unknown, context: { ids: string[] }) => void;
  cacheSize?: number;
}

export interface TaskDependencyLoader {
  loadMany(ids: string[]): Promise<Map<string, boolean>>;
  clear(ids?: string | string[]): void;
  prime(id: string, completed: boolean): void;
}

const normaliseIds = (ids: string[]): string[] => {
  const unique = new Set<string>();
  for (const value of ids) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed.length === 0) continue;
    unique.add(trimmed);
  }
  return Array.from(unique);
};

export function createTaskDependencyLoader(options: TaskDependencyLoaderOptions): TaskDependencyLoader {
  const cache = new Map<string, boolean>();
  const order: string[] = [];
  const maxSize = options.cacheSize ?? 500;

  const applyCacheLimit = () => {
    while (order.length > maxSize) {
      const oldest = order.shift();
      if (oldest) {
        cache.delete(oldest);
      }
    }
  };

  const fetchBatch = async (ids: string[]) => {
    const normalised = normaliseIds(ids);
    if (normalised.length === 0) {
      return new Map<string, boolean>();
    }

    try {
      const { data, error } = await options.supabase
        .from('agent_orchestration_tasks')
        .select('id, status')
        .in('id', normalised)
        .eq('status', 'COMPLETED');

      if (error) {
        throw error;
      }

      const completed = new Set<string>((data ?? []).map((row) => String(row.id)));
      const result = new Map<string, boolean>();

      for (const id of normalised) {
        const isCompleted = completed.has(id);
        cache.set(id, isCompleted);
        order.push(id);
        result.set(id, isCompleted);
      }

      applyCacheLimit();
      options.onBatchResolved?.({ ids: normalised, completedCount: completed.size });

      return result;
    } catch (error) {
      options.onBatchError?.(error, { ids: normaliseIds(ids) });
      throw error;
    }
  };

  const loadMany = async (ids: string[]): Promise<Map<string, boolean>> => {
    const normalised = normaliseIds(ids);
    const missing = normalised.filter((id) => !cache.has(id));

    if (missing.length > 0) {
      await fetchBatch(missing);
    }

    const result = new Map<string, boolean>();
    for (const id of normalised) {
      result.set(id, cache.get(id) ?? false);
    }

    return result;
  };

  const prime = (id: string, completed: boolean) => {
    const normalised = normaliseIds([id]);
    if (normalised.length === 0) return;
    const key = normalised[0];
    cache.set(key, completed);
    order.push(key);
    applyCacheLimit();
  };

  const clear = (ids?: string | string[]) => {
    if (!ids) {
      cache.clear();
      order.length = 0;
      return;
    }

    const values = Array.isArray(ids) ? ids : [ids];
    for (const id of values) {
      const normalised = normaliseIds([id]);
      if (normalised.length === 0) continue;
      const key = normalised[0];
      cache.delete(key);
      const index = order.indexOf(key);
      if (index >= 0) {
        order.splice(index, 1);
      }
    }
  };

  return {
    loadMany,
    clear,
    prime,
  };
}

export type PendingTaskRow = {
  id: string;
  depends_on?: unknown;
};

export async function resolveAssignableTaskIds(
  tasks: PendingTaskRow[],
  loader: Pick<TaskDependencyLoader, 'loadMany'>,
  onError?: (error: unknown, context: { dependencyCount: number }) => void,
): Promise<string[]> {
  const dependencyMap = new Map<string, string[]>();
  const dependencyIds: string[] = [];

  for (const task of tasks) {
    const dependencies = Array.isArray(task.depends_on)
      ? (task.depends_on as string[])
      : [];
    dependencyMap.set(task.id, dependencies);
    for (const dependencyId of dependencies) {
      if (typeof dependencyId === 'string' && dependencyId.trim().length > 0) {
        dependencyIds.push(dependencyId);
      }
    }
  }

  if (dependencyIds.length === 0) {
    return tasks.map((task) => task.id);
  }

  try {
    const completionMap = await loader.loadMany(dependencyIds);
    const completed = new Set<string>();
    for (const [id, isCompleted] of completionMap.entries()) {
      if (isCompleted) {
        completed.add(id);
      }
    }

    return tasks
      .filter((task) => {
        const dependencies = dependencyMap.get(task.id) ?? [];
        return dependencies.every((id) => completed.has(id));
      })
      .map((task) => task.id);
  } catch (error) {
    onError?.(error, { dependencyCount: dependencyIds.length });
    return [];
  }
}
