'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAgentTasks, type AgentTaskResult } from '../services/task-service';
import { queryKeys } from '../../common/query-keys';
import { useAppStore } from '@/src/store/app-store';
import { useAuthStore } from '@/src/store/auth-store';

const EMPTY_AGENT_TASK_RESULT: AgentTaskResult = Object.freeze({
  tasks: [],
  total: 0,
  source: 'stub',
});

export function useAgentTasks() {
  const rawOrgSlug = useAppStore((state) => state.orgSlug);
  const orgSlug = rawOrgSlug?.trim() || 'demo';
  const token = useAuthStore((state) => state.session?.access_token ?? null);

  const queryKey = useMemo(() => queryKeys.agents.tasks(orgSlug), [orgSlug]);

  const query = useQuery<AgentTaskResult>({
    queryKey,
    queryFn: () => fetchAgentTasks(orgSlug, token),
  });

  const result = query.data ?? EMPTY_AGENT_TASK_RESULT;

  return {
    tasks: result.tasks,
    total: result.total,
    source: result.source,
    ...query,
  };
}
