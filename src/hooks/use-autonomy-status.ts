import { useQuery } from '@tanstack/react-query';

import { fetchAutonomyStatus, AutonomyStatus } from '@/lib/autonomy';

export function useAutonomyStatus(orgSlug?: string) {
  return useQuery<AutonomyStatus>({
    queryKey: ['autonomy_status', orgSlug],
    enabled: Boolean(orgSlug),
    queryFn: () => fetchAutonomyStatus(orgSlug!),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
