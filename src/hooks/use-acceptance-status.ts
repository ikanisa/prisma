import { useQuery } from '@tanstack/react-query';
import { fetchAcceptanceStatus, type AcceptanceSnapshot } from '@/lib/acceptance-service';
import { useOrganizations } from '@/hooks/use-organizations';

export function useAcceptanceStatus(engagementId: string | null) {
  const { currentOrg } = useOrganizations();

  return useQuery<AcceptanceSnapshot>({
    queryKey: ['acceptance-status', currentOrg?.slug, engagementId],
    queryFn: () => fetchAcceptanceStatus(currentOrg!.slug, engagementId!),
    enabled: Boolean(currentOrg?.slug && engagementId),
    staleTime: 30_000,
  });
}
