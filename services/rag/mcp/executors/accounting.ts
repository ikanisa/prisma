import type { TaskExecutorResult, TaskExecutionContext } from '../executors.js';

interface BaseParams {
  input: Record<string, unknown> | undefined;
  context: TaskExecutionContext;
  sessionId: string;
  taskId: string;
}

function parseOrgEngagement(input: Record<string, unknown> | undefined) {
  const orgId = typeof input?.orgId === 'string' ? input.orgId : null;
  const engagementId = typeof input?.engagementId === 'string' ? input.engagementId : null;
  return { orgId, engagementId };
}

export async function reconciliationExecutor({ input, context, sessionId, taskId }: BaseParams): Promise<TaskExecutorResult> {
  const { orgId, engagementId } = parseOrgEngagement(input);
  if (!orgId || !engagementId) {
    return {
      status: 'error',
      output: { error: 'orgId and engagementId are required for reconciliation summary.' },
      metadata: { executor: 'accounting-reconciliation-summary' },
    };
  }

  try {
    const { data, error } = await context.supabase
      .from('reconciliations')
      .select('id, type, status, difference, entity_id')
      .eq('org_id', orgId)
      .eq('engagement_id', engagementId)
      .limit(500);

    if (error) throw error;

    const rows = data ?? [];
    const summary = rows.reduce(
      (acc, row) => {
        const type = row.type ?? 'UNKNOWN';
        acc.byType[type] = (acc.byType[type] ?? 0) + 1;
        if (row.status === 'CLOSED') acc.closed += 1;
        if (row.status !== 'CLOSED') acc.open += 1;
        if (typeof row.difference === 'number') {
          acc.totalDifference += row.difference;
        }
        return acc;
      },
      { byType: {} as Record<string, number>, open: 0, closed: 0, totalDifference: 0 },
    );

    context.logInfo?.('mcp.executor.accounting_reconciliation_summary', {
      sessionId,
      taskId,
      reconciliationCount: rows.length,
    });

    return {
      status: 'success',
      output: {
        orgId,
        engagementId,
        reconciliationCount: rows.length,
        summary,
        generatedAt: new Date().toISOString(),
      },
      metadata: {
        executor: 'accounting-reconciliation-summary',
        reconciliationCount: rows.length,
        openReconciliations: summary.open,
        totalDifference: summary.totalDifference,
      },
    };
  } catch (error) {
    context.logError('mcp.executor.accounting_reconciliation_summary_failed', error, { sessionId, taskId });
    return {
      status: 'error',
      output: {
        error: error instanceof Error ? error.message : 'Unknown error in reconciliation summary executor',
      },
      metadata: { executor: 'accounting-reconciliation-summary', error: true },
    };
  }
}

export async function journalExecutor({ input, context, sessionId, taskId }: BaseParams): Promise<TaskExecutorResult> {
  const { orgId, engagementId } = parseOrgEngagement(input);
  if (!orgId || !engagementId) {
    return {
      status: 'error',
      output: { error: 'orgId and engagementId are required for journal queue summary.' },
      metadata: { executor: 'accounting-journal-summary' },
    };
  }

  try {
    const { data, error } = await context.supabase
      .from('journal_entries')
      .select('id, status, posted_at, total_debit, total_credit')
      .eq('org_id', orgId)
      .eq('engagement_id', engagementId)
      .limit(500);

    if (error) throw error;

    const entries = data ?? [];
    const counts = entries.reduce(
      (acc, entry) => {
        const status = entry.status ?? 'UNKNOWN';
        acc.byStatus[status] = (acc.byStatus[status] ?? 0) + 1;
        if (!entry.posted_at) acc.pending += 1;
        else acc.posted += 1;
        acc.totalDebit += entry.total_debit ?? 0;
        acc.totalCredit += entry.total_credit ?? 0;
        return acc;
      },
      { byStatus: {} as Record<string, number>, pending: 0, posted: 0, totalDebit: 0, totalCredit: 0 },
    );

    context.logInfo?.('mcp.executor.accounting_journal_summary', {
      sessionId,
      taskId,
      journalCount: entries.length,
    });

    return {
      status: 'success',
      output: {
        orgId,
        engagementId,
        journalCount: entries.length,
        summary: counts,
        generatedAt: new Date().toISOString(),
      },
      metadata: {
        executor: 'accounting-journal-summary',
        journalCount: entries.length,
        pendingJournals: counts.pending,
      },
    };
  } catch (error) {
    context.logError('mcp.executor.accounting_journal_summary_failed', error, { sessionId, taskId });
    return {
      status: 'error',
      output: {
        error: error instanceof Error ? error.message : 'Unknown error in journal summary executor',
      },
      metadata: { executor: 'accounting-journal-summary', error: true },
    };
  }
}

export async function closeStatusExecutor({ input, context, sessionId, taskId }: BaseParams): Promise<TaskExecutorResult> {
  const { orgId, engagementId } = parseOrgEngagement(input);
  if (!orgId || !engagementId) {
    return {
      status: 'error',
      output: { error: 'orgId and engagementId are required for close status summary.' },
      metadata: { executor: 'accounting-close-summary' },
    };
  }

  try {
    const { data, error } = await context.supabase
      .from('close_periods')
      .select('id, status, locked_at, locked_by_user_id')
      .eq('org_id', orgId)
      .eq('engagement_id', engagementId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    const period = data?.[0] ?? null;
    const status = period?.status ?? 'OPEN';

    context.logInfo?.('mcp.executor.accounting_close_summary', { sessionId, taskId, status });

    return {
      status: 'success',
      output: {
        orgId,
        engagementId,
        currentStatus: status,
        lockedAt: period?.locked_at ?? null,
        lockedBy: period?.locked_by_user_id ?? null,
        generatedAt: new Date().toISOString(),
      },
      metadata: {
        executor: 'accounting-close-summary',
        currentStatus: status,
      },
    };
  } catch (error) {
    context.logError('mcp.executor.accounting_close_summary_failed', error, { sessionId, taskId });
    return {
      status: 'error',
      output: {
        error: error instanceof Error ? error.message : 'Unknown error in close status executor',
      },
      metadata: { executor: 'accounting-close-summary', error: true },
    };
  }
}
