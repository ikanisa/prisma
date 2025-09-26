import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { lockCloseSchema } from '../../../../../lib/accounting/schemas';
import { logActivity } from '../../../../../lib/accounting/activity-log';
import { attachRequestId, getOrCreateRequestId } from '../../../lib/observability';
import { createApiGuard } from '../../../lib/api-guard';

const LOCK_PREREQ_STATUS = ['APPROVED', 'OBSOLETE'];
const RECON_CLOSED_STATUS = ['CLOSED'];
const JOURNAL_CLOSED_STATUS = ['POSTED', 'REJECTED'];

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();
  let payload;
  try {
    payload = lockCloseSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, attachRequestId({ status: 400 }, requestId));
    }
    return NextResponse.json({ error: 'Invalid JSON body' }, attachRequestId({ status: 400 }, requestId));
  }

  const guard = await createApiGuard({
    request,
    supabase,
    requestId,
    orgId: payload.orgId,
    resource: `close:lock:${payload.periodId}`,
    rateLimit: { limit: 15, windowSeconds: 300 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data: period } = await supabase
    .from('close_periods')
    .select('id, status')
    .eq('id', payload.periodId)
    .eq('org_id', payload.orgId)
    .maybeSingle();

  if (!period) {
    return guard.json({ error: 'Period not found' }, { status: 404 });
  }

  if (period.status !== 'READY_TO_LOCK') {
    return guard.json({ error: `Period must be READY_TO_LOCK, found ${period.status}` }, { status: 409 });
  }

  const { data: pbcItems } = await supabase
    .from('close_pbc_items')
    .select('id, title, status')
    .eq('org_id', payload.orgId)
    .eq('period_id', payload.periodId);

  const outstandingPbc = (pbcItems ?? []).filter((item) => !LOCK_PREREQ_STATUS.includes(item.status));
  if (outstandingPbc.length > 0) {
    return guard.json({ error: 'Pending PBC items', items: outstandingPbc }, { status: 422 });
  }

  const { data: recons } = await supabase
    .from('reconciliations')
    .select('id, type, status')
    .eq('org_id', payload.orgId)
    .eq('period_id', payload.periodId);

  const openRecons = (recons ?? []).filter((rec) => !RECON_CLOSED_STATUS.includes(rec.status));
  if (openRecons.length > 0) {
    return guard.json({ error: 'All reconciliations must be closed', reconciliations: openRecons }, { status: 422 });
  }

  const { data: openVariance } = await supabase
    .from('variance_results')
    .select('id, rule_id')
    .eq('org_id', payload.orgId)
    .eq('period_id', payload.periodId)
    .eq('status', 'OPEN');

  if (openVariance && openVariance.length > 0) {
    return guard.json({ error: 'Resolve variance exceptions before locking', variances: openVariance }, { status: 422 });
  }

  const { data: journalBatches } = await supabase
    .from('journal_batches')
    .select('id, status')
    .eq('org_id', payload.orgId)
    .eq('period_id', payload.periodId);

  const pendingJournals = (journalBatches ?? []).filter((batch) => !JOURNAL_CLOSED_STATUS.includes(batch.status));
  if (pendingJournals.length > 0) {
    return guard.json({ error: 'All journals must be posted or rejected', journals: pendingJournals }, { status: 422 });
  }

  const { data: latestSnapshot } = await supabase
    .from('trial_balance_snapshots')
    .select('id')
    .eq('org_id', payload.orgId)
    .eq('period_id', payload.periodId)
    .order('snapshot_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const updates = supabase
    .from('close_periods')
    .update({
      status: 'LOCKED',
      locked_at: new Date().toISOString(),
      locked_by_user_id: payload.userId,
    })
    .eq('id', payload.periodId)
    .eq('org_id', payload.orgId);

  const snapshotUpdate = latestSnapshot
    ? supabase
        .from('trial_balance_snapshots')
        .update({ locked: true })
        .eq('id', latestSnapshot.id)
    : null;

  const [{ error: periodError }, snapshotResult] = await Promise.all([updates, snapshotUpdate ?? Promise.resolve({ error: null })]);

  if (periodError || (snapshotResult && 'error' in snapshotResult && snapshotResult.error)) {
    return guard.json(
      { error: periodError?.message ?? snapshotResult?.error?.message ?? 'Lock failed' },
      { status: 500 },
    );
  }

  await logActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'CLOSE_LOCKED',
    entityType: 'CLOSE_PERIOD',
    entityId: payload.periodId,
    metadata: { requestId },
  });

  return guard.respond({ status: 'LOCKED' });
}
