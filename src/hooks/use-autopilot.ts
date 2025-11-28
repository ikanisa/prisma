import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';
import {
  fetchSchedules,
  createSchedule,
  fetchJobs,
  enqueueJob,
  type AutopilotJob,
  type AutopilotSchedule,
} from '@/lib/autopilot';
import { getAllowedAutopilotJobs, getDefaultAutonomyLevel } from '@/lib/system-config';

export function useAutopilotSchedules() {
  const { currentOrg } = useOrganizations();
  return useQuery<AutopilotSchedule[]>({
    queryKey: ['autopilot_schedules', currentOrg?.slug],
    enabled: Boolean(currentOrg?.slug),
    queryFn: () => fetchSchedules(currentOrg!.slug),
  });
}

export function useAutopilotJobs(status?: string) {
  const { currentOrg } = useOrganizations();
  const key = useMemo(() => ['autopilot_jobs', currentOrg?.slug, status] as const, [currentOrg?.slug, status]);
  return useQuery<AutopilotJob[]>({
    queryKey: key,
    enabled: Boolean(currentOrg?.slug),
    queryFn: () => fetchJobs(currentOrg!.slug, status),
    refetchInterval: 30_000,
  });
}

export function useCreateAutopilotSchedule() {
  const { currentOrg } = useOrganizations();
  const client = useQueryClient();
  const { toast } = useToast();
  const defaultAutonomyLevel = getDefaultAutonomyLevel();
  const orgAutonomyLevel = (currentOrg?.autonomy_level as string | undefined) ?? defaultAutonomyLevel;
  const allowedJobs = useMemo(() => getAllowedAutopilotJobs(orgAutonomyLevel), [orgAutonomyLevel]);

  return useMutation({
    mutationFn: (params: { kind: string; cronExpression: string; active: boolean; metadata: Record<string, unknown> }) => {
      if (!currentOrg?.slug) {
        throw new Error('Organization not selected');
      }
      if (!allowedJobs.includes(params.kind)) {
        throw new Error('Current autonomy level does not permit scheduling this job.');
      }
      return createSchedule({ orgSlug: currentOrg.slug, ...params, kind: params.kind.toLowerCase() });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['autopilot_schedules', currentOrg?.slug] });
      toast({ title: 'Schedule saved', description: 'Autopilot job will run based on the new cadence.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Unable to save schedule',
        description: error?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useEnqueueAutopilotJob() {
  const { currentOrg } = useOrganizations();
  const client = useQueryClient();
  const { toast } = useToast();
  const defaultAutonomyLevel = getDefaultAutonomyLevel();
  const orgAutonomyLevel = (currentOrg?.autonomy_level as string | undefined) ?? defaultAutonomyLevel;
  const allowedJobs = useMemo(() => getAllowedAutopilotJobs(orgAutonomyLevel), [orgAutonomyLevel]);

  return useMutation({
    mutationFn: (params: { kind: string; payload: Record<string, unknown> }) => {
      if (!currentOrg?.slug) {
        throw new Error('Organization not selected');
      }
      if (!allowedJobs.includes(params.kind)) {
        throw new Error('Current autonomy level does not permit running this job.');
      }
      return enqueueJob({ orgSlug: currentOrg.slug, ...params, kind: params.kind.toLowerCase() });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['autopilot_jobs', currentOrg?.slug] });
      toast({ title: 'Job queued', description: 'Autopilot will process the job shortly.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Unable to queue job',
        description: error?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}
