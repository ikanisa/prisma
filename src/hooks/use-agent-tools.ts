import { useQuery } from '@tanstack/react-query';
import { getAgentTools, type AgentToolRecord } from '@/services/agent-tools.service';

export function useAgentTools(orgId?: string | null) {
  return useQuery<AgentToolRecord[]>({
    queryKey: ['agent-tools', orgId ?? 'all'],
    queryFn: () => getAgentTools(orgId),
    enabled: orgId !== undefined,
  });
}

export type { AgentToolRecord } from '@/services/agent-tools.service';
