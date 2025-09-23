import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { logAuditActivity } from '../../../../../lib/audit/activity-log';
import { runAdaSchema } from '../../../../../lib/audit/schemas';
import { runAnalytics, hashDataset } from '../../../../../lib/audit/analytics-engine';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  const engagementId = searchParams.get('engagementId');

  if (!orgId || !engagementId) {
    return NextResponse.json({ error: 'orgId and engagementId are required query parameters.' }, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();
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
  let payload;
  try {
    payload = runAdaSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const { kind, orgId, engagementId, userId, datasetRef, params } = payload;
  const supabase = getServiceSupabaseClient();

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
    return NextResponse.json({ error: insertError?.message ?? 'Failed to record analytics run metadata.' }, { status: 500 });
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
    },
  });

  const analyticsResult = runAnalytics(kind, params as never);
  if (analyticsResult.summary.datasetHash !== datasetHash) {
    return NextResponse.json(
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
      return NextResponse.json({ error: exceptionError.message ?? 'Failed to record analytics exceptions.' }, { status: 500 });
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
    return NextResponse.json({ error: updateError?.message ?? 'Failed to finalise analytics run.' }, { status: 500 });
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
    },
  });

  return NextResponse.json({ run: updatedRun, exceptions: insertedExceptions });
}
