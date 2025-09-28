import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrganizations } from '@/hooks/use-organizations';
import {
  fetchPbcRequests,
  instantiatePbcTemplate,
  updatePbcRequestStatus,
  remindPbcRequest,
  type PbcRequest,
  type PbcRequestStatus,
} from '@/lib/pbc-service';

const queryKey = (orgSlug?: string | null, engagementId?: string | null) => [
  'pbc-requests',
  orgSlug,
  engagementId,
];

export function usePbcManager(engagementId: string | null) {
  const { currentOrg } = useOrganizations();
  const queryClient = useQueryClient();

  const query = useQuery<{ requests: PbcRequest[] }, Error>({
    queryKey: queryKey(currentOrg?.slug, engagementId),
    queryFn: () => fetchPbcRequests(currentOrg!.slug, engagementId!),
    enabled: Boolean(currentOrg?.slug && engagementId),
    staleTime: 30_000,
  });

  const invalidate = () => {
    if (currentOrg?.slug && engagementId) {
      void queryClient.invalidateQueries({ queryKey: queryKey(currentOrg.slug, engagementId) });
    }
  };

  const instantiateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof instantiatePbcTemplate>[0]) => instantiatePbcTemplate(payload),
    onSuccess: invalidate,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (payload: {
      requestId: string;
      status: PbcRequestStatus;
      documentId?: string | null;
      note?: string | null;
      procedureId?: string | null;
    }) =>
      updatePbcRequestStatus({
        orgSlug: currentOrg!.slug,
        requestId: payload.requestId,
        status: payload.status,
        documentId: payload.documentId,
        note: payload.note,
        procedureId: payload.procedureId,
      }),
    onSuccess: invalidate,
  });

  const remindMutation = useMutation({
    mutationFn: (payload: { requestId: string; message?: string }) =>
      remindPbcRequest({ orgSlug: currentOrg!.slug, requestId: payload.requestId, message: payload.message }),
  });

  return {
    query,
    requests: query.data?.requests ?? [],
    isLoading: query.isLoading,
    instantiate: instantiateMutation,
    updateStatus: updateStatusMutation,
    remind: remindMutation,
  };
}

export type { PbcRequest, PbcRequestStatus } from '@/lib/pbc-service';
