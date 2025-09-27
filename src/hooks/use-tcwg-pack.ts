import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrganizations } from '@/hooks/use-organizations';
import {
  fetchTcwgPack,
  createTcwgPack,
  updateTcwgPack,
  renderTcwgPack,
  buildTcwgZip,
  submitTcwgPack,
  decideTcwgApproval,
  sendTcwgPack,
  type TcwgPack,
  type TcwgApprovalsResponse,
} from '@/lib/tcwg-service';

const queryKey = (orgSlug?: string | null, engagementId?: string | null) => [
  'tcwg-pack',
  orgSlug,
  engagementId,
];

export function useTcwgPack(engagementId: string | null) {
  const { currentOrg } = useOrganizations();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKey(currentOrg?.slug, engagementId),
    queryFn: () => fetchTcwgPack(currentOrg!.slug, engagementId!),
    enabled: Boolean(currentOrg?.slug && engagementId),
    staleTime: 30_000,
  });

  const invalidate = () => {
    if (currentOrg?.slug && engagementId) {
      void queryClient.invalidateQueries({ queryKey: queryKey(currentOrg.slug, engagementId) });
    }
  };

  const createMutation = useMutation({
    mutationFn: () => createTcwgPack({ orgSlug: currentOrg!.slug, engagementId: engagementId! }),
    onSuccess: invalidate,
  });

  type UpdateTcwgInput = Omit<Parameters<typeof updateTcwgPack>[0], 'orgSlug' | 'engagementId'>;

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateTcwgInput) =>
      updateTcwgPack({ ...payload, orgSlug: currentOrg!.slug, engagementId: engagementId! }),
    onSuccess: invalidate,
  });

  const renderMutation = useMutation({
    mutationFn: (packId: string) => renderTcwgPack({ orgSlug: currentOrg!.slug, engagementId: engagementId!, packId }),
    onSuccess: invalidate,
  });

  const zipMutation = useMutation({
    mutationFn: (packId: string) => buildTcwgZip({ orgSlug: currentOrg!.slug, engagementId: engagementId!, packId }),
    onSuccess: invalidate,
  });

  const submitMutation = useMutation({
    mutationFn: (packId: string) => submitTcwgPack({ orgSlug: currentOrg!.slug, engagementId: engagementId!, packId }),
    onSuccess: invalidate,
  });

  const approvalMutation = useMutation({
    mutationFn: (payload: { approvalId: string; decision: 'APPROVED' | 'REJECTED'; note?: string }) =>
      decideTcwgApproval({
        orgSlug: currentOrg!.slug,
        engagementId: engagementId!,
        approvalId: payload.approvalId,
        decision: payload.decision,
        note: payload.note,
      }),
    onSuccess: invalidate,
  });

  const sendMutation = useMutation({
    mutationFn: (packId: string) => sendTcwgPack({ orgSlug: currentOrg!.slug, engagementId: engagementId!, packId }),
    onSuccess: invalidate,
  });

  return {
    query,
    pack: query.data?.pack ?? null,
    approvals: (query.data?.approvals as TcwgApprovalsResponse['approvals']) ?? [],
    reportReleased: query.data?.reportReleased ?? false,
    isLoading: query.isLoading,
    create: createMutation,
    update: updateMutation,
    renderPdf: renderMutation,
    buildZip: zipMutation,
    submit: submitMutation,
    approve: approvalMutation,
    send: sendMutation,
  };
}
