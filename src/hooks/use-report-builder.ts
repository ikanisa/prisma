import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrganizations } from '@/hooks/use-organizations';
import {
  fetchReport,
  createReportDraft,
  updateReportDraft,
  submitReportDraft,
  releaseReport,
  runDecisionTree,
  exportReportPdf,
  type AuditReportDraft,
  type ApprovalQueueItem,
} from '@/lib/report-service';

const queryKey = (orgSlug?: string | null, engagementId?: string | null) => [
  'audit-report',
  orgSlug,
  engagementId,
];

export function useReportBuilder(engagementId: string | null) {
  const { currentOrg } = useOrganizations();
  const queryClient = useQueryClient();

  const baseQuery = useQuery<{ report: AuditReportDraft | null; approvals: ApprovalQueueItem[] }, Error>({
    queryKey: queryKey(currentOrg?.slug, engagementId),
    queryFn: () => fetchReport(currentOrg!.slug, engagementId!),
    enabled: Boolean(currentOrg?.slug && engagementId),
    staleTime: 30_000,
  });

  const invalidate = () => {
    if (currentOrg?.slug && engagementId) {
      void queryClient.invalidateQueries({ queryKey: queryKey(currentOrg.slug, engagementId) });
    }
  };

  const createMutation = useMutation({
    mutationFn: () => createReportDraft({ orgSlug: currentOrg!.slug, engagementId: engagementId! }),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: (
      payload: Omit<Parameters<typeof updateReportDraft>[0], 'orgSlug' | 'engagementId'>,
    ) =>
      updateReportDraft({ ...payload, orgSlug: currentOrg!.slug, engagementId: engagementId! }),
    onSuccess: invalidate,
  });

  const submitMutation = useMutation({
    mutationFn: (reportId: string) => submitReportDraft({ orgSlug: currentOrg!.slug, engagementId: engagementId!, reportId }),
    onSuccess: invalidate,
  });

  const releaseMutation = useMutation({
    mutationFn: (reportId: string) => releaseReport({ orgSlug: currentOrg!.slug, engagementId: engagementId!, reportId }),
    onSuccess: invalidate,
  });

  const decisionTreeMutation = useMutation({
    mutationFn: () => runDecisionTree({ orgSlug: currentOrg!.slug, engagementId: engagementId! }),
  });

  const exportPdfMutation = useMutation({
    mutationFn: (reportId: string) => exportReportPdf({ orgSlug: currentOrg!.slug, engagementId: engagementId!, reportId }),
  });

  return {
    query: baseQuery,
    report: baseQuery.data?.report ?? null,
    approvals: baseQuery.data?.approvals ?? [],
    isLoading: baseQuery.isLoading,
    create: createMutation,
    update: updateMutation,
    submit: submitMutation,
    release: releaseMutation,
    decisionTree: decisionTreeMutation,
    exportPdf: exportPdfMutation,
  };
}
