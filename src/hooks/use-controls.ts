import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrganizations } from '@/hooks/use-organizations';
import {
  fetchControls,
  upsertControl,
  logControlWalkthrough,
  runControlTest,
  createDeficiency,
  upsertItgcGroup,
  type Control,
  type Deficiency,
  type ItgcGroup,
  type ControlWalkthroughResult,
  type ControlTestResult,
  type DeficiencySeverity,
  type DeficiencyStatus,
  type ItgcType,
} from '@/lib/controls-service';

const queryKey = (orgSlug?: string | null, engagementId?: string | null) => [
  'controls',
  orgSlug,
  engagementId,
];

export function useControlsManager(engagementId: string | null) {
  const { currentOrg } = useOrganizations();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKey(currentOrg?.slug, engagementId),
    queryFn: () => fetchControls(currentOrg!.slug, engagementId!),
    enabled: Boolean(currentOrg?.slug && engagementId),
    staleTime: 30_000,
  });

  const invalidate = () => {
    if (currentOrg?.slug && engagementId) {
      void queryClient.invalidateQueries({ queryKey: queryKey(currentOrg.slug, engagementId) });
    }
  };

  const createControlMutation = useMutation({
    mutationFn: upsertControl,
    onSuccess: invalidate,
  });

  const logWalkthroughMutation = useMutation({
    mutationFn: logControlWalkthrough,
    onSuccess: invalidate,
  });

  const runTestMutation = useMutation({
    mutationFn: runControlTest,
    onSuccess: invalidate,
  });

  const createDeficiencyMutation = useMutation({
    mutationFn: createDeficiency,
    onSuccess: invalidate,
  });

  const upsertItgcMutation = useMutation({
    mutationFn: upsertItgcGroup,
    onSuccess: invalidate,
  });

  return {
    query,
    controls: query.data?.controls ?? [],
    itgcGroups: query.data?.itgcGroups ?? [],
    deficiencies: query.data?.deficiencies ?? [],
    isLoading: query.isLoading,
    createControl: createControlMutation,
    logWalkthrough: logWalkthroughMutation,
    runTest: runTestMutation,
    createDeficiency: createDeficiencyMutation,
    upsertItgc: upsertItgcMutation,
  };
}

export type { Control, Deficiency, ItgcGroup, ControlWalkthroughResult, ControlTestResult, DeficiencySeverity, DeficiencyStatus, ItgcType } from '@/lib/controls-service';
