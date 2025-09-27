import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrganizations } from '@/hooks/use-organizations';
import {
  fetchAcceptanceStatus,
  runBackgroundScreen,
  saveIndependenceAssessment,
  submitAcceptanceDecision,
  decideAcceptanceApproval,
  type AcceptanceStatus,
  type AcceptanceSnapshot,
} from '@/lib/acceptance-service';

interface UseAcceptanceOptions {
  engagementId: string | null;
  clientId?: string | null;
}

export function useAcceptance({ engagementId, clientId }: UseAcceptanceOptions) {
  const { currentOrg } = useOrganizations();
  const queryClient = useQueryClient();

  const query = useQuery<AcceptanceSnapshot>({
    queryKey: ['acceptance', currentOrg?.slug, engagementId],
    queryFn: () => fetchAcceptanceStatus(currentOrg!.slug, engagementId!),
    enabled: Boolean(currentOrg?.slug && engagementId),
    staleTime: 30_000,
  });

  const invalidate = () => {
    if (currentOrg?.slug && engagementId) {
      void queryClient.invalidateQueries({ queryKey: ['acceptance', currentOrg.slug, engagementId] });
    }
  };

  const backgroundMutation = useMutation({
    mutationFn: (payload: { screenings: Record<string, unknown>; riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN'; notes?: string }) => {
      if (!clientId) throw new Error('client_id_required');
      return runBackgroundScreen({
        orgSlug: currentOrg!.slug,
        clientId,
        screenings: payload.screenings,
        riskRating: payload.riskRating,
        notes: payload.notes,
      });
    },
    onSuccess: invalidate,
  });

  const independenceMutation = useMutation({
    mutationFn: (payload: { threats: unknown[]; safeguards: unknown[]; conclusion: 'OK' | 'SAFEGUARDS_REQUIRED' | 'PROHIBITED' }) => {
      if (!clientId) throw new Error('client_id_required');
      return saveIndependenceAssessment({
        orgSlug: currentOrg!.slug,
        clientId,
        threats: payload.threats,
        safeguards: payload.safeguards,
        conclusion: payload.conclusion,
      });
    },
    onSuccess: invalidate,
  });

  const decisionMutation = useMutation({
    mutationFn: (payload: { decision: 'ACCEPT' | 'DECLINE'; eqrRequired: boolean; rationale?: string }) =>
      submitAcceptanceDecision({
        orgSlug: currentOrg!.slug,
        engagementId: engagementId!,
        decision: payload.decision,
        eqrRequired: payload.eqrRequired,
        rationale: payload.rationale,
      }),
    onSuccess: invalidate,
  });

  const approvalMutation = useMutation({
    mutationFn: (payload: { approvalId: string; decision: 'APPROVED' | 'REJECTED'; note?: string }) =>
      decideAcceptanceApproval({
        orgSlug: currentOrg!.slug,
        engagementId: engagementId!,
        approvalId: payload.approvalId,
        decision: payload.decision,
        note: payload.note,
      }),
    onSuccess: invalidate,
  });

  const snapshot = query.data ?? null;
  const status = snapshot?.status ?? null;

  return {
    data: snapshot,
    status: status?.status ?? null,
    decision: status?.decision ?? null,
    eqrRequired: status?.eqrRequired ?? false,
    rationale: status?.rationale ?? null,
    approvals: snapshot?.approvals ?? [],
    backgroundData: snapshot?.background ?? null,
    independenceData: snapshot?.independence ?? null,
    isLoading: query.isLoading,
    background: backgroundMutation,
    independence: independenceMutation,
    submitDecision: decisionMutation,
    approveDecision: approvalMutation,
  };
}

export type AcceptanceState = {
  status: AcceptanceStatus | null;
  decision: 'ACCEPT' | 'DECLINE' | null;
  eqrRequired: boolean;
  rationale: string | null;
};
