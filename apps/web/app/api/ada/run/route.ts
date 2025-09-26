import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { logAuditActivity } from '../../../../../lib/audit/activity-log';
import { runAdaSchema } from '../../../../../lib/audit/schemas';
import { runAnalytics, hashDataset } from '../../../../../lib/audit/analytics-engine';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { ensureAuditRecordApprovalStage, upsertAuditModuleRecord } from '../../../../../lib/audit/module-records';
import { buildEvidenceManifest } from '../../../../../lib/audit/evidence';
import { attachRequestId, getOrCreateRequestId } from '../../../lib/observability';
import { createApiGuard } from '../../../lib/api-guard';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  const engagementId = searchParams.get('engagementId');

  if (!orgId || !engagementId) {
    return NextResponse.json({ error: 'orgId and engagementId are required query parameters.' }, { status: 400 });
  }

  const supabase = await getServiceSupabaseClient();
  const { data, error } = await supabase
    .from('ada_runs')
    .select('*, ada_exceptions(*)')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .order('started_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Failed to load analytics runs.' }, { status: 500 });
  }

  return NextResponse.json({ runs: data ?? [] });
}

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  let payload;
  try {
    payload = runAdaSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, attachRequestId({ status: 400 }, requestId));
    }
    return NextResponse.json({ error: 'Invalid JSON payload.' }, attachRequestId({ status: 400 }, requestId));
  }

  const { kind, orgId, engagementId, userId, datasetRef, params } = payload;
  const supabase = await getServiceSupabaseClient();

  const guard = await createApiGuard({
    request,
    supabase,
    requestId,
    orgId,
    resource: `ada:run:${orgId}:${kind}`,
    rateLimit: { limit: 10, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const datasetHash = hashDataset(params);
  const { data: insertedRun, error: insertError } = await supabase
    .from('ada_runs')
    .insert({
      org_id: orgId,
      engagement_id: engagementId,
      kind,
      dataset_ref: datasetRef,
      dataset_hash: datasetHash,
      params,
      created_by: userId,
    })
    .select()
    .maybeSingle();

  if (insertError || !insertedRun) {
    return guard.json(
      { error: insertError?.message ?? 'Failed to record analytics run metadata.' },
      { status: 500 },
    );
  }

  await logAuditActivity(supabase, {
    orgId,
    userId,
    action: 'ADA_RUN_STARTED',
    entityType: 'AUDIT_ANALYTICS',
    entityId: insertedRun.id,
    metadata: {
      kind,
      datasetRef,
      datasetHash,
      requestId,
    },
  });

  try {
    const manifest = buildEvidenceManifest({
      moduleCode: 'ADA1',
      recordRef: insertedRun.id,
      dataset: {
        ref: datasetRef,
        hash: datasetHash,
        parameters: params as Record<string, unknown>,
      },
      metadata: {
        startedAt: insertedRun.started_at,
        kind,
      },
    });

    await upsertAuditModuleRecord(supabase, {
      orgId,
      engagementId,
      moduleCode: 'ADA1',
      recordRef: insertedRun.id,
      title: `${kind} analytics run`,
      metadata: {
        datasetRef,
        datasetHash,
        params,
        startedAt: insertedRun.started_at,
        manifest,
      },
      recordStatus: 'IN_PROGRESS',
      approvalState: 'DRAFT',
      currentStage: 'PREPARER',
      preparedByUserId: userId,
      userId,
    });
  } catch (moduleError) {
    const message = moduleError instanceof Error ? moduleError.message : 'Failed to sync analytics audit module record.';
    return guard.json({ error: message }, { status: 500 });
  }

  const analyticsResult = runAnalytics(kind, params as never);
  if (analyticsResult.summary.datasetHash !== datasetHash) {
    return guard.json(
      { error: 'Dataset hash mismatch detected while processing analytics run.' },
      { status: 500 },
    );
  }

  let insertedExceptions: Array<{ id: string; record_ref: string; score: number | null }> = [];
  if (analyticsResult.exceptions.length > 0) {
    const exceptionPayload = analyticsResult.exceptions.map(exception => ({
      run_id: insertedRun.id,
      record_ref: exception.recordRef,
      reason: exception.reason,
      score: exception.score,
      created_by: userId,
    }));

    const { data: exceptions, error: exceptionError } = await supabase
      .from('ada_exceptions')
      .insert(exceptionPayload)
      .select();

    if (exceptionError) {
      return guard.json(
        { error: exceptionError.message ?? 'Failed to record analytics exceptions.' },
        { status: 500 },
      );
    }

    insertedExceptions = exceptions ?? [];

    await Promise.all(
      insertedExceptions.map(exception =>
        logAuditActivity(supabase, {
          orgId,
          userId,
          action: 'ADA_EXCEPTION_ADDED',
          entityType: 'AUDIT_ANALYTICS',
          entityId: insertedRun.id,
          metadata: {
            exceptionId: exception.id,
            recordRef: exception.record_ref,
            score: exception.score,
            requestId,
          },
        }),
      ),
    );
  }

  const finishedAt = new Date().toISOString();
  const { data: updatedRun, error: updateError } = await supabase
    .from('ada_runs')
    .update({
      summary: analyticsResult.summary,
      finished_at: finishedAt,
    })
    .eq('id', insertedRun.id)
    .select('*, ada_exceptions(*)')
    .maybeSingle();

  if (updateError || !updatedRun) {
    return guard.json(
      { error: updateError?.message ?? 'Failed to finalise analytics run.' },
      { status: 500 },
    );
  }

  await logAuditActivity(supabase, {
    orgId,
    userId,
    action: 'ADA_RUN_COMPLETED',
    entityType: 'AUDIT_ANALYTICS',
    entityId: insertedRun.id,
    metadata: {
      kind,
      datasetRef,
      datasetHash,
      totals: analyticsResult.summary.totals,
      exceptions: analyticsResult.exceptions.length,
      requestId,
    },
  });

  try {
    const manifest = buildEvidenceManifest({
      moduleCode: 'ADA1',
      recordRef: insertedRun.id,
      dataset: {
        ref: datasetRef,
        hash: datasetHash,
        parameters: analyticsResult.summary.parameters as Record<string, unknown>,
      },
      metadata: {
        summary: analyticsResult.summary,
        exceptions: analyticsResult.exceptions.length,
        finishedAt,
        kind,
      },
    });

    await upsertAuditModuleRecord(supabase, {
      orgId,
      engagementId,
      moduleCode: 'ADA1',
      recordRef: insertedRun.id,
      title: `${kind} analytics run`,
      metadata: {
        datasetRef,
        datasetHash,
        summary: analyticsResult.summary,
        exceptions: analyticsResult.exceptions.length,
        finishedAt,
        manifest,
      },
      recordStatus: 'READY_FOR_REVIEW',
      approvalState: 'SUBMITTED',
      currentStage: 'MANAGER',
      updatedByUserId: userId,
    });

    await ensureAuditRecordApprovalStage(supabase, {
      orgId,
      engagementId,
      moduleCode: 'ADA1',
      recordRef: insertedRun.id,
      stage: 'MANAGER',
      decision: 'PENDING',
      metadata: {
        datasetHash,
        exceptions: analyticsResult.exceptions.length,
      },
      userId,
    });
  } catch (moduleError) {
    const message = moduleError instanceof Error ? moduleError.message : 'Failed to flag analytics run for review.';
    return guard.json({ error: message }, { status: 500 });
  }

  return guard.respond({ run: updatedRun, exceptions: insertedExceptions });
}
