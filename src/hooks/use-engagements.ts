import { useQuery } from '@tanstack/react-query';
import { getEngagements, type EngagementRecord } from '@/services/engagements.service';

export function useEngagements(orgId?: string | null) {
  return useQuery<EngagementRecord[]>({
    queryKey: ['engagements', orgId ?? 'all'],
    queryFn: () => getEngagements(orgId),
    enabled: Boolean(orgId),
  });
}

export type { EngagementRecord } from '@/services/engagements.service';
