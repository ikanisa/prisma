import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { closeReconciliationSchema } from '../../../../../lib/accounting/schemas';
import { logActivity } from '../../../../../lib/accounting/activity-log';
import { ensureAuditRecordApprovalStage, upsertAuditModuleRecord } from '../../../../../lib/audit/module-records';
import { buildEvidenceManifest } from '../../../../../lib/audit/evidence';
import { attachRequestId, getOrCreateRequestId } from '../../../../../lib/observability';
import { createApiGuard } from '../../../../../lib/api-guard';

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();
  let payload;
  try {
    payload = closeReconciliationSchema.parse(await request.json());
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
    resource: `reconciliation:close:${payload.reconciliationId}`,
    rateLimit: { limit: 30, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data: recon } = await supabase
    .from('reconciliations')
    .select('id, org_id, entity_id, type, gl_balance, external_balance, difference, status, prepared_by_user_id')
    .eq('id', payload.reconciliationId)
    .eq('org_id', payload.orgId)
    .maybeSingle();

  if (!recon) {
    return guard.json({ error: 'Reconciliation not found' }, { status: 404 });
  }

  const { data: items } = await supabase
    .from('reconciliation_items')
    .select('amount, resolved')
    .eq('reconciliation_id', payload.reconciliationId);

  const adjustments = (items ?? []).filter((item) => item.resolved).reduce((sum, item) => sum + item.amount, 0);
  const remaining = recon.difference - adjustments;

  if (Math.abs(remaining) > 0.01) {
    return guard.json({ error: 'Reconciliation difference must be cleared or supported', remaining }, { status: 422 });
  }

  const closedAt = new Date().toISOString();

  const { error } = await supabase
    .from('reconciliations')
    .update({
      status: 'CLOSED',
      reviewed_by_user_id: payload.userId,
      closed_at: closedAt,
      schedule_document_id: payload.scheduleDocumentId ?? null,
    })
    .eq('id', payload.reconciliationId)
    .eq('org_id', payload.orgId);

  if (error) {
    return guard.json({ error: error.message }, { status: 500 });
  }

  await logActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'RECON_CLOSED',
    entityType: 'RECONCILIATION',
    entityId: payload.reconciliationId,
    metadata: { adjustments, remaining },
  });

  const { data: moduleRecord } = await supabase
    .from('audit_module_records')
    .select('engagement_id')
    .eq('org_id', payload.orgId)
    .eq('module_code', 'REC1')
    .eq('record_ref', payload.reconciliationId)
    .maybeSingle();

  if (moduleRecord?.engagement_id) {
    const manifest = buildEvidenceManifest({
      moduleCode: 'REC1',
      recordRef: payload.reconciliationId,
      attachments: payload.scheduleDocumentId
        ? [
            {
              documentId: payload.scheduleDocumentId,
              kind: 'RECON_SCHEDULE',
            },
          ]
        : undefined,
      metadata: {
        adjustments,
        difference: recon.difference,
        closedAt,
      },
    });

    try {
      await upsertAuditModuleRecord(supabase, {
        orgId: payload.orgId,
        engagementId: moduleRecord.engagement_id,
        moduleCode: 'REC1',
        recordRef: payload.reconciliationId,
        title: `${recon.type} reconciliation`,
        recordStatus: 'READY_FOR_REVIEW',
        approvalState: 'SUBMITTED',
        currentStage: 'MANAGER',
        currentReviewerUserId: null,
        metadata: {
          type: recon.type,
          glBalance: recon.gl_balance,
          externalBalance: recon.external_balance,
          difference: recon.difference,
          adjustments,
          manifest,
          scheduleDocumentId: payload.scheduleDocumentId ?? null,
        },
        updatedByUserId: payload.userId,
      });

      await ensureAuditRecordApprovalStage(supabase, {
        orgId: payload.orgId,
        engagementId: moduleRecord.engagement_id,
        moduleCode: 'REC1',
        recordRef: payload.reconciliationId,
        stage: 'MANAGER',
        decision: 'PENDING',
        metadata: {
          adjustments,
          difference: recon.difference,
          scheduleDocumentId: payload.scheduleDocumentId ?? null,
        },
        userId: payload.userId,
      });
    } catch (moduleError) {
      return guard.json(
        { error: moduleError instanceof Error ? moduleError.message : 'Failed to update reconciliation approvals.' },
        { status: 500 },
      );
    }
  }

  return guard.respond({ status: 'CLOSED' });
}
