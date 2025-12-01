import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { getActivityLogs, type ActivityRecord } from '@/services/activity.service';

export function useActivityLogs(orgId?: string | null) {
  const enabled = isSupabaseConfigured ? Boolean(orgId) : true;

  return useQuery<ActivityRecord[]>({
    queryKey: ['activity-logs', orgId ?? 'all'],
    queryFn: () => getActivityLogs(orgId),
    enabled,
  });
}

export type { ActivityRecord } from '@/services/activity.service';
