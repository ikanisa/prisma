import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { addReconciliationItemSchema } from '../../../../../lib/accounting/schemas';
import { upsertAuditModuleRecord } from '../../../../../lib/audit/module-records';
import { attachRequestId, getOrCreateRequestId } from '../../../../../lib/observability';
import { createApiGuard } from '../../../../../lib/api-guard';

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = getServiceSupabaseClient();

  let payload;
  try {
    payload = addReconciliationItemSchema.parse(await request.json());
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
    resource: `reconciliation:item:${payload.reconciliationId}`,
    rateLimit: { limit: 60, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data: recon } = await supabase
    .from('reconciliations')
    .select('id, org_id, type, gl_balance, external_balance, difference, prepared_by_user_id')
    .eq('id', payload.reconciliationId)
    .eq('org_id', payload.orgId)
    .maybeSingle();

  if (!recon) {
    return guard.json({ error: 'Reconciliation not found' }, { status: 404 });
  }

  const { error } = await supabase.from('reconciliation_items').insert({
    org_id: payload.orgId,
    reconciliation_id: payload.reconciliationId,
    category: payload.item.category,
    amount: payload.item.amount,
    reference: payload.item.reference ?? null,
    note: payload.item.note ?? null,
    resolved: payload.item.resolved ?? false,
  });

  if (error) {
    return guard.json({ error: error.message }, { status: 500 });
  }

  const { data: items } = await supabase
    .from('reconciliation_items')
    .select('id, amount, resolved, category, reference, note')
    .eq('reconciliation_id', payload.reconciliationId);

  const outstanding = (items ?? []).filter((item) => !item.resolved);
  const outstandingTotal = outstanding.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  const { data: moduleRecord } = await supabase
    .from('audit_module_records')
    .select('engagement_id')
    .eq('org_id', payload.orgId)
    .eq('module_code', 'REC1')
    .eq('record_ref', payload.reconciliationId)
    .maybeSingle();

  if (moduleRecord?.engagement_id) {
    try {
      await upsertAuditModuleRecord(supabase, {
        orgId: payload.orgId,
        engagementId: moduleRecord.engagement_id,
        moduleCode: 'REC1',
        recordRef: payload.reconciliationId,
        title: `${recon.type} reconciliation`,
        metadata: {
          type: recon.type,
          difference: recon.difference,
          glBalance: recon.gl_balance,
          externalBalance: recon.external_balance,
          outstandingCount: outstanding.length,
          outstandingTotal,
        },
        updatedByUserId: recon.prepared_by_user_id ?? null,
      });
    } catch (moduleError) {
      return guard.json(
        { error: moduleError instanceof Error ? moduleError.message : 'Failed to update audit module register.' },
        { status: 500 },
      );
    }
  }

  return guard.respond({ inserted: 1 });
}
