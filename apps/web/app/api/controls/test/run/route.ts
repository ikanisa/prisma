import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { attachRequestId, getOrCreateRequestId } from '@/app/lib/observability';
import { createApiGuard } from '@/app/lib/api-guard';
import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { getSamplingClient, SamplingServiceError } from '@/lib/audit/sampling-client';
import { controlTestResultEnum } from '@/lib/audit/schemas';
import { upsertTestRun, listTestRuns } from '@/lib/audit/test-run-store';
import type { SamplingAttributeRequest, SamplingAttributeResult } from '@/lib/audit/types';
import type { SamplingPlanItem } from '@/lib/audit/sampling-client';
import { logger } from '@/lib/logger';

const attributeSchema = z.object({
  attributeKey: z.string().min(1),
  population: z.number().int().positive(),
  description: z.string().optional(),
});

const runRequestSchema = z.object({
  orgId: z.string().min(1),
  engagementId: z.string().min(1),
  controlId: z.string().min(1),
  userId: z.string().min(1),
  testPlanId: z.string().min(1),
  attributes: z.array(attributeSchema).min(1),
  result: controlTestResultEnum,
  runId: z.string().optional(),
  samplePlanRef: z.string().optional(),
});

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);
  return NextResponse.json(
    { runs: listTestRuns() },
    attachRequestId({ status: 200 }, requestId),
  );
}

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  let payload;

  try {
    payload = runRequestSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.flatten() },
        attachRequestId({ status: 400 }, requestId),
      );
    }
    return NextResponse.json(
      { error: 'Invalid JSON payload.' },
      attachRequestId({ status: 400 }, requestId),
    );
  }

  const {
    orgId,
    engagementId,
    controlId,
    userId,
    result,
    samplePlanRef,
    testPlanId,
    attributes,
    runId,
  } = payload;

  const supabase = await getServiceSupabaseClient();
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

  const samplingClient = getSamplingClient();
  let plan;
  try {
    plan = await samplingClient.requestPlan({
      orgId,
      engagementId,
      controlId,
      requestedSampleSize: attributes.length,
    });
  } catch (error) {
    if (error instanceof SamplingServiceError) {
      logger.error('controls.test.run.sampling_failed', { error, requestId, orgId, engagementId, controlId });
      return guard.json(
        { error: error.message },
        { status: error.statusCode ?? 503 },
      );
    }
    logger.error('controls.test.run.plan_unexpected_error', { error, requestId, orgId, engagementId, controlId });
    return guard.json(
      { error: 'Unable to request a sampling plan.' },
      { status: 500 },
    );
  }

  const run = upsertTestRun({
    id: runId,
    controlId,
    testPlanId,
    samplePlanRef: samplePlanRef ?? plan.id,
    samplePlanUrl: plan.items.length ? plan.items[0]?.populationRef ?? plan.id : plan.id,
    status: plan.source === 'service' ? 'completed' : 'partial',
    attributes: mapAttributes(attributes, plan.items),
    requestedAt: plan.generatedAt,
  });

  return guard.respond({
    run,
    samplingPlan: plan,
    result,
  }, { status: runId ? 200 : 201 });
}

function mapAttributes(source: SamplingAttributeRequest[], planItems: SamplingPlanItem[]): SamplingAttributeResult[] {
  return source.map((attribute, index) => {
    const planItem = planItems[index];
    const samples: SamplingAttributeResult['samples'] = planItem
      ? [
          {
            recordId: planItem.id,
            description: planItem.description ?? planItem.populationRef ?? attribute.attributeKey,
          },
        ]
      : [];

    return {
      attributeKey: attribute.attributeKey,
      population: attribute.population,
      description: attribute.description,
      sampleSize: samples.length || 1,
      status: 'sampled',
      samples,
    };
  });
}
