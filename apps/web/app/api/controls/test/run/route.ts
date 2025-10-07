import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { runControlTestSchema } from '../../../../../lib/audit/schemas';
import { logAuditActivity } from '../../../../../lib/audit/activity-log';
import { getSamplingClient } from '../../../../../lib/audit/sampling-client';

export async function POST(request: Request) {
  const supabase = getServiceSupabaseClient();
  let payload;

  try {
    payload = runControlTestSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const { orgId, engagementId, controlId, userId, attributes, result, samplePlanRef, deficiencyRecommendation, deficiencySeverity } =
    payload;

  const { data: control, error: controlError } = await supabase
    .from('controls')
    .select('cycle, objective, engagement_id')
    .eq('id', controlId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (controlError) {
    return NextResponse.json({ error: controlError.message }, { status: 500 });
  }

  if (!control) {
    return NextResponse.json({ error: 'Control not found for sampling.' }, { status: 404 });
  }

  if (!control.engagement_id) {
    return NextResponse.json({ error: 'Control engagement is not configured.' }, { status: 400 });
  }

  if (engagementId && engagementId !== control.engagement_id) {
    return NextResponse.json({ error: 'Control does not belong to the specified engagement.' }, { status: 400 });
  }

  const controlEngagementId = control.engagement_id;

  const samplingClient = getSamplingClient();
  const samplingPlan = await samplingClient.requestPlan({
    orgId,
    engagementId: controlEngagementId,
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
    return NextResponse.json({ error: testError?.message ?? 'Failed to record control test.' }, { status: 500 });
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
    },
  });

  let deficiency = null;
  if (result === 'EXCEPTIONS') {
    const severity = deficiencySeverity ?? 'MEDIUM';
    const { data, error } = await supabase
      .from('deficiencies')
      .insert({
        org_id: orgId,
        engagement_id: controlEngagementId,
        control_id: controlId,
        recommendation: deficiencyRecommendation!,
        severity,
      })
      .select()
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Exceptions noted but deficiency creation failed.' }, { status: 500 });
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
      },
    });
  }

  return NextResponse.json({ test, deficiency, samplingPlan });
}
