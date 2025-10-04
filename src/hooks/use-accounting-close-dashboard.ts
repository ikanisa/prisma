import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useOrganizations } from '@/hooks/use-organizations';
import { logger } from '@/lib/logger';

type ClosePeriodRow = Database['public']['Tables']['close_periods']['Row'];
type PbcItemRow = Database['public']['Tables']['close_pbc_items']['Row'];
type ReconciliationRow = Database['public']['Tables']['reconciliations']['Row'];
type JournalBatchRow = Database['public']['Tables']['journal_batches']['Row'];
type VarianceResultRow = Database['public']['Tables']['variance_results']['Row'];
type ActivityRow = Database['public']['Tables']['activity_log']['Row'];

function normaliseMetadata(metadata: ActivityRow['metadata']): Record<string, any> {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, any>;
  }
  try {
    if (typeof metadata === 'string') {
      const parsed = JSON.parse(metadata);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
    }
  } catch (error) {
    logger.warn('accounting_close.metadata_parse_failed', error);
  }
  return {};
}

function buildActivityMessage(entry: ActivityRow): string {
  const action = entry.action ?? 'ACTIVITY_EVENT';
  const metadata = normaliseMetadata(entry.metadata);
  switch (action) {
    case 'GL_ACCOUNTS_IMPORTED':
      return `Imported ${metadata?.count ?? 0} chart of accounts rows.`;
    case 'GL_ENTRIES_IMPORTED':
      return `Imported ${metadata?.count ?? 0} ledger entries.`;
    case 'RECON_CREATED':
      return `Reconciliation ${metadata?.type ?? ''} created.`;
    case 'RECON_CLOSED':
      return `Reconciliation ${metadata?.type ?? ''} closed.`;
    case 'PBC_INSTANTIATED':
      return `Created ${metadata?.inserted ?? 0} PBC requests.`;
    case 'CLOSE_ADVANCED':
      return `Close advanced from ${metadata?.from ?? 'UNKNOWN'} to ${metadata?.to ?? 'UNKNOWN'}.`;
    case 'CLOSE_LOCKED':
      return 'Close period locked.';
    case 'VARIANCE_RUN':
      return `Variance run triggered ${metadata?.triggered ?? 0} exceptions.`;
    default:
      return action.replace(/_/g, ' ').toLowerCase();
  }
}

export function useAccountingCloseDashboard() {
  const { currentOrg } = useOrganizations();
  const orgId = currentOrg?.id ?? null;
  const orgSlug = currentOrg?.slug ?? null;

  const closePeriodQuery = useQuery({
    queryKey: ['close-period', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('close_periods')
        .select('id, org_id, name, status, start_date, end_date, locked_at, locked_by_user_id, updated_at')
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw new Error(error.message);
      return (data?.[0] ?? null) as ClosePeriodRow | null;
    },
  });

  const periodId = closePeriodQuery.data?.id ?? null;

  const pbcQuery = useQuery({
    queryKey: ['close-pbc', periodId],
    enabled: Boolean(periodId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('close_pbc_items')
        .select('id, org_id, period_id, title, area, status, due_at, assignee_user_id, created_at, document_id, updated_at')
        .eq('period_id', periodId!)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as PbcItemRow[];
    },
  });

  const reconciliationsQuery = useQuery({
    queryKey: ['close-reconciliations', periodId],
    enabled: Boolean(periodId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reconciliations')
        .select('id, org_id, period_id, type, status, difference, gl_balance, external_balance, prepared_by_user_id, reviewed_by_user_id, updated_at')
        .eq('period_id', periodId!)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as ReconciliationRow[];
    },
  });

  const journalBatchesQuery = useQuery({
    queryKey: ['close-journal-batches', periodId],
    enabled: Boolean(periodId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_batches')
        .select('id, org_id, period_id, reference, status, prepared_by_user_id, approved_by_user_id, posted_at, created_at, updated_at, note')
        .eq('period_id', periodId!)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as JournalBatchRow[];
    },
  });

  const varianceQuery = useQuery({
    queryKey: ['close-variance', periodId],
    enabled: Boolean(periodId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('variance_results')
        .select('id, org_id, period_id, target_code, status, value, baseline, delta_abs, delta_pct, explanation, updated_at')
        .eq('period_id', periodId!)
        .order('updated_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as VarianceResultRow[];
    },
  });

  const activityQuery = useQuery({
    queryKey: ['close-activity', orgId, periodId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const query = supabase
        .from('activity_log')
        .select('id, org_id, entity_id, entity_type, action, metadata, created_at')
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(25);
      if (periodId) {
        query.eq('entity_id', periodId);
      } else {
        query.eq('entity_type', 'ACCOUNTING_CLOSE');
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as ActivityRow[];
    },
  });

  const isLoading =
    closePeriodQuery.isLoading ||
    pbcQuery.isLoading ||
    reconciliationsQuery.isLoading ||
    journalBatchesQuery.isLoading ||
    varianceQuery.isLoading ||
    activityQuery.isLoading;

  const refetch = useCallback(async () => {
    await Promise.all([
      closePeriodQuery.refetch(),
      pbcQuery.refetch(),
      reconciliationsQuery.refetch(),
      journalBatchesQuery.refetch(),
      varianceQuery.refetch(),
      activityQuery.refetch(),
    ]);
  }, [closePeriodQuery, pbcQuery, reconciliationsQuery, journalBatchesQuery, varianceQuery, activityQuery]);

  const activity = useMemo(
    () =>
      (activityQuery.data ?? []).map((entry) => ({
        id: entry.id,
        timestamp: entry.created_at ?? new Date().toISOString(),
        message: buildActivityMessage(entry),
      })),
    [activityQuery.data],
  );

  return {
    orgSlug,
    closePeriod: closePeriodQuery.data ?? null,
    pbcItems: pbcQuery.data ?? [],
    reconciliations: reconciliationsQuery.data ?? [],
    journalBatches: journalBatchesQuery.data ?? [],
    varianceResults: varianceQuery.data ?? [],
    activity,
    isLoading,
    refetch,
  };
}
