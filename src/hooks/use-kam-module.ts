import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganizations } from '@/hooks/use-organizations';
import {
  fetchKamData,
  addCandidate,
  updateCandidateStatus,
  createDraft,
  updateDraft,
  submitDraft,
  decideApproval,
  exportKams,
  type KamListResponse,
  type KamCandidate,
  type KamDraft,
} from '@/lib/kam-service';

const queryKey = (orgSlug?: string | null, engagementId?: string | null) => [
  'kam-module',
  orgSlug,
  engagementId,
];

export function useKamModule(engagementId: string | null) {
  const { currentOrg } = useOrganizations();
  const queryClient = useQueryClient();

  const query = useQuery<KamListResponse, Error>({
    queryKey: queryKey(currentOrg?.slug, engagementId),
    queryFn: () => fetchKamData(currentOrg!.slug, engagementId!),
    enabled: Boolean(currentOrg?.slug && engagementId),
    staleTime: 30_000,
  });

  const invalidate = () => {
    if (currentOrg?.slug && engagementId) {
      void queryClient.invalidateQueries({ queryKey: queryKey(currentOrg.slug, engagementId) });
    }
  };

  const addCandidateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof addCandidate>[0]) => addCandidate(payload),
    onSuccess: invalidate,
  });

  const selectCandidateMutation = useMutation({
    mutationFn: (payload: { candidateId: string; reason?: string }) =>
      updateCandidateStatus({
        orgSlug: currentOrg!.slug,
        engagementId: engagementId!,
        candidateId: payload.candidateId,
        reason: payload.reason,
        action: 'select',
      }),
    onSuccess: invalidate,
  });

  const excludeCandidateMutation = useMutation({
    mutationFn: (payload: { candidateId: string; reason?: string }) =>
      updateCandidateStatus({
        orgSlug: currentOrg!.slug,
        engagementId: engagementId!,
        candidateId: payload.candidateId,
        reason: payload.reason,
        action: 'exclude',
      }),
    onSuccess: invalidate,
  });

  const createDraftMutation = useMutation({
    mutationFn: (payload: { candidateId: string; heading?: string; whyKam?: string }) =>
      createDraft({
        orgSlug: currentOrg!.slug,
        engagementId: engagementId!,
        candidateId: payload.candidateId,
        heading: payload.heading,
        whyKam: payload.whyKam,
      }),
    onSuccess: invalidate,
  });

  type UpdateDraftInput = Omit<Parameters<typeof updateDraft>[0], 'orgSlug' | 'engagementId'>;

  const updateDraftMutation = useMutation({
    mutationFn: (payload: UpdateDraftInput) =>
      updateDraft({ ...payload, orgSlug: currentOrg!.slug, engagementId: engagementId! }),
    onSuccess: invalidate,
  });

  const submitDraftMutation = useMutation({
    mutationFn: (draftId: string) =>
      submitDraft({ orgSlug: currentOrg!.slug, engagementId: engagementId!, draftId }),
    onSuccess: invalidate,
  });

  const exportMutation = useMutation({
    mutationFn: (format: 'json' | 'markdown') =>
      exportKams(currentOrg!.slug, engagementId!, format),
  });

  const approvalDecisionMutation = useMutation({
    mutationFn: (payload: { approvalId: string; decision: 'APPROVED' | 'REJECTED'; note?: string }) =>
      decideApproval({
        orgSlug: currentOrg!.slug,
        engagementId: engagementId!,
        approvalId: payload.approvalId,
        decision: payload.decision,
        note: payload.note,
      }),
    onSuccess: invalidate,
  });

  return {
    query,
    data: query.data,
    isLoading: query.isLoading,
    addCandidate: addCandidateMutation,
    selectCandidate: selectCandidateMutation,
    excludeCandidate: excludeCandidateMutation,
    createDraft: createDraftMutation,
    updateDraft: updateDraftMutation,
    submitDraft: submitDraftMutation,
    exportKams: exportMutation,
    decideApproval: approvalDecisionMutation,
  };
}

export function findDraftByCandidate(
  drafts: KamDraft[] | undefined,
  candidateId: string,
) {
  return drafts?.find((draft) => draft.candidate_id === candidateId);
}

export function candidateStatusLabel(candidate: KamCandidate) {
  switch (candidate.status) {
    case 'CANDIDATE':
      return 'Candidate';
    case 'SELECTED':
      return 'Selected';
    case 'EXCLUDED':
      return 'Excluded';
    default:
      return candidate.status;
  }
}
