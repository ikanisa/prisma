'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAgentTasks } from '../services/task-service';
import { queryKeys } from '../../common/query-keys';
import { useAppStore } from '@/src/store/app-store';
import { useAuthStore } from '@/src/store/auth-store';

export function useAgentTasks() {
  const orgSlug = useAppStore((state) => state.orgSlug);
  const token = useAuthStore((state) => state.session?.access_token ?? null);

  const queryKey = useMemo(() => queryKeys.agents.tasks(orgSlug), [orgSlug]);

  const query = useQuery({
    queryKey,
    queryFn: async () => fetchAgentTasks(orgSlug ?? 'demo', token),
    enabled: Boolean(orgSlug),
    suspense: true,
    useErrorBoundary: true,
  });

  return {
    tasks: query.data?.tasks ?? [],
    total: query.data?.total ?? 0,
    source: query.data?.source ?? 'stub',
    ...query,
  };
}
