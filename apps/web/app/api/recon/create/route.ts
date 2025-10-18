import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { createReconciliationSchema } from '@/lib/accounting/schemas';
import { logActivity } from '@/lib/accounting/activity-log';
import { upsertAuditModuleRecord } from '@/lib/audit/module-records';
import { attachRequestId, getOrCreateRequestId } from '@/app/lib/observability';
import { createApiGuard } from '@/app/lib/api-guard';

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();
  let payload;
  try {
    payload = createReconciliationSchema.parse(await request.json());
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
    resource: `reconciliation:create:${payload.orgId}:${payload.entityId}:${payload.periodId}`,
    rateLimit: { limit: 30, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  let glBalance = 0;
  if (payload.controlAccountId) {
    const { data: entries } = await supabase
      .from('ledger_entries')
      .select('debit, credit')
      .eq('account_id', payload.controlAccountId)
      .eq('org_id', payload.orgId)
      .eq('entity_id', payload.entityId)
      .eq('period_id', payload.periodId);
    glBalance = (entries ?? []).reduce((sum, entry) => sum + entry.debit - entry.credit, 0);
  }

  const difference = glBalance - payload.externalBalance;

  const { data, error } = await supabase
    .from('reconciliations')
    .insert({
      org_id: payload.orgId,
      entity_id: payload.entityId,
      period_id: payload.periodId,
      type: payload.type,
      control_account_id: payload.controlAccountId ?? null,
      gl_balance: glBalance,
      external_balance: payload.externalBalance,
      difference,
      prepared_by_user_id: payload.preparedByUserId,
      status: 'IN_PROGRESS',
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return guard.json({ error: error?.message ?? 'Failed to create reconciliation' }, { status: 500 });
  }

  await logActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.preparedByUserId,
    action: 'RECON_CREATED',
    entityType: 'RECONCILIATION',
    entityId: data.id,
    metadata: { type: payload.type, difference },
  });

  if (payload.engagementId) {
    try {
      await upsertAuditModuleRecord(supabase, {
        orgId: payload.orgId,
        engagementId: payload.engagementId,
        moduleCode: 'REC1',
        recordRef: data.id,
        title: `${payload.type} reconciliation`,
        recordStatus: 'IN_PROGRESS',
        approvalState: 'DRAFT',
        currentStage: 'PREPARER',
        preparedByUserId: payload.preparedByUserId,
        ownerUserId: payload.preparedByUserId,
        metadata: {
          type: payload.type,
          glBalance,
          externalBalance: payload.externalBalance,
          difference,
        },
        userId: payload.preparedByUserId,
      });
    } catch (moduleError) {
      return guard.json(
        { error: moduleError instanceof Error ? moduleError.message : 'Failed to register reconciliation in audit module tracker.' },
        { status: 500 },
      );
    }
  }

  return guard.respond({ reconciliation: data });
}
