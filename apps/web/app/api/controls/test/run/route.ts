import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { runControlTestSchema } from '../../../../../lib/audit/schemas';
import { logAuditActivity } from '../../../../../lib/audit/activity-log';
import { getSamplingClient } from '../../../../../lib/audit/sampling-client';
import { ensureAuditRecordApprovalStage, upsertAuditModuleRecord } from '../../../../../lib/audit/module-records';
import { buildEvidenceManifest } from '../../../../../lib/audit/evidence';
import { attachRequestId, getOrCreateRequestId } from '../../../../lib/observability';
import { createApiGuard } from '../../../../lib/api-guard';

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();
  let payload;

  try {
    payload = runControlTestSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, attachRequestId({ status: 400 }, requestId));
    }
    return NextResponse.json({ error: 'Invalid JSON payload.' }, attachRequestId({ status: 400 }, requestId));
  }

  const {
    orgId,
    engagementId,
    controlId,
    userId,
    attributes,
    result,
    samplePlanRef,
    deficiencyRecommendation,
    deficiencySeverity,
  } = payload;

  const guard = await createApiGuard({
    request,
    supabase,
    requestId,
    orgId,
    resource: `controls:test:${controlId}`,
    rateLimit: { limit: 30, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data: control, error: controlError } = await supabase
    .from('controls')
    .select('cycle, objective')
    .eq('id', controlId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (controlError) {
    return guard.json({ error: controlError.message }, { status: 500 });
  }

  if (!control) {
    return guard.json({ error: 'Control not found for sampling.' }, { status: 404 });
  }

  const samplingClient = getSamplingClient();
  const samplingPlan = await samplingClient.requestPlan({
    orgId,
    engagementId,
    controlId,
    requestedSampleSize: attributes.length,
    cycle: control.cycle,
    objective: control.objective,
  });

  const enrichedAttributes = attributes.map((attribute, index) => {
    const planItem = samplingPlan.items[index];
    return {
      ...attribute,
      sampleItemId: planItem?.id ?? null,
      populationRef: planItem?.populationRef ?? null,
      stratum: planItem?.stratum ?? null,
      manualReference: samplePlanRef ?? null,
    };
  });

  const { data: test, error: testError } = await supabase
    .from('control_tests')
    .insert({
      org_id: orgId,
      control_id: controlId,
      attributes: enrichedAttributes,
      result,
      sample_plan_ref: samplingPlan.id,
      performed_by: userId,
    })
    .select()
    .maybeSingle();

  if (testError || !test) {
    return guard.json({ error: testError?.message ?? 'Failed to record control test.' }, { status: 500 });
  }

  const exceptionsCount = enrichedAttributes.filter(item => !item.passed).length;

  await logAuditActivity(supabase, {
    orgId,
    userId,
    action: 'CTRL_TEST_RUN',
    entityId: controlId,
    metadata: {
      testId: test.id,
      samplePlanRef: samplingPlan.id,
      result: test.result,
      sampleSize: enrichedAttributes.length,
      exceptions: exceptionsCount,
      samplingSource: samplingPlan.source,
      requestId,
    },
  });

  let deficiency = null;
  if (result === 'EXCEPTIONS') {
    const severity = deficiencySeverity ?? 'MEDIUM';
    const { data, error } = await supabase
      .from('deficiencies')
      .insert({
        org_id: orgId,
        engagement_id: engagementId,
        control_id: controlId,
        recommendation: deficiencyRecommendation!,
        severity,
      })
      .select()
      .maybeSingle();

    if (error || !data) {
      return guard.json(
        { error: error?.message ?? 'Exceptions noted but deficiency creation failed.' },
        { status: 500 },
      );
    }
    deficiency = data;

    await logAuditActivity(supabase, {
      orgId,
      userId,
      action: 'CTRL_DEFICIENCY_RAISED',
      entityId: controlId,
      metadata: {
        deficiencyId: data.id,
        severity: data.severity,
        requestId,
      },
    });
  }

  try {
    const manifest = buildEvidenceManifest({
      moduleCode: 'CTRL1',
      recordRef: controlId,
      sampling: {
        planId: samplingPlan.id,
        size: enrichedAttributes.length,
        source: samplingPlan.source,
        items: samplingPlan.items,
      },
      metadata: {
        result,
        exceptions: exceptionsCount,
      },
    });

    const metadata: Record<string, unknown> = {
      lastTestRunAt: manifest.generatedAt,
      samplePlanId: samplingPlan.id,
      sampleSource: samplingPlan.source,
      sampleSize: enrichedAttributes.length,
      exceptions: exceptionsCount,
      result,
      manifest,
    };

    if (deficiency) {
      metadata.deficiencyId = deficiency.id;
      metadata.deficiencySeverity = deficiency.severity;
    }

    await upsertAuditModuleRecord(supabase, {
      orgId,
      engagementId,
      moduleCode: 'CTRL1',
      recordRef: controlId,
      recordStatus: 'READY_FOR_REVIEW',
      approvalState: 'SUBMITTED',
      currentStage: 'MANAGER',
      currentReviewerUserId: null,
      metadata,
      updatedByUserId: userId,
    });

    await ensureAuditRecordApprovalStage(supabase, {
      orgId,
      engagementId,
      moduleCode: 'CTRL1',
      recordRef: controlId,
      stage: 'MANAGER',
      decision: 'PENDING',
      metadata: {
        samplePlanId: samplingPlan.id,
        exceptions: exceptionsCount,
        result,
      },
      userId,
    });
  } catch (moduleError) {
    const message = moduleError instanceof Error ? moduleError.message : 'Failed to flag audit module record for review.';
    return guard.json({ error: message }, { status: 500 });
  }

  return guard.respond({ test, deficiency, samplingPlan });
}
