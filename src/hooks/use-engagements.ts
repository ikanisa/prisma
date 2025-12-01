import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getEngagements,
  createEngagement,
  updateEngagement,
  type EngagementRecord,
  type CreateEngagementInput,
  type UpdateEngagementInput,
} from '@/services/engagements.service';

export function useEngagements(orgId?: string | null) {
  return useQuery<EngagementRecord[]>({
    queryKey: ['engagements', orgId ?? 'all'],
    queryFn: () => getEngagements(orgId),
    enabled: Boolean(orgId),
  });
}

export function useCreateEngagement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEngagementInput) => createEngagement(input),
    onSuccess: (engagement) => {
      queryClient.setQueryData<EngagementRecord[]>(
        ['engagements', engagement.orgId],
        (previous = []) => [engagement, ...previous.filter((item) => item.id !== engagement.id)],
      );
    },
  });
}

export function useUpdateEngagement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEngagementInput) => updateEngagement(input),
    onSuccess: (engagement) => {
      queryClient.setQueryData<EngagementRecord[]>(
        ['engagements', engagement.orgId],
        (previous = []) => previous.map((item) => (item.id === engagement.id ? engagement : item)),
      );
    },
  });
}

export type { EngagementRecord } from '@/services/engagements.service';
