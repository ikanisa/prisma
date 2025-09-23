import { NextRequest, NextResponse } from 'next/server';
import { createSamplingClient, SamplingServiceError } from '../../../../../lib/audit/sampling-client';
import type { SamplingClient } from '../../../../../lib/audit/sampling-client';
import { listTestRuns, upsertTestRun } from '../../../../../lib/audit/test-run-store';
import type { SamplingAttributeRequest } from '../../../../../lib/audit/types';

type SamplingClientFactory = () => SamplingClient;

let samplingClientFactory: SamplingClientFactory = () => createSamplingClient();

export function setSamplingClientFactory(factory: SamplingClientFactory | null) {
  samplingClientFactory = factory ?? (() => createSamplingClient());
}

function getSamplingClient() {
  return samplingClientFactory();
}

export async function GET() {
  const runs = listTestRuns();
  return NextResponse.json({ runs });
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isRecord(payload)) {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
  }

  const controlId = typeof payload.controlId === 'string' ? payload.controlId.trim() : '';
  const testPlanId = typeof payload.testPlanId === 'string' ? payload.testPlanId.trim() : '';
  const runId = typeof payload.runId === 'string' && payload.runId.trim() ? payload.runId.trim() : undefined;

  if (!controlId) {
    return NextResponse.json({ error: 'controlId is required' }, { status: 400 });
  }

  if (!testPlanId) {
    return NextResponse.json({ error: 'testPlanId is required' }, { status: 400 });
  }

  const attributesResult = parseAttributes(payload.attributes);
  if (!attributesResult.ok) {
    return NextResponse.json({ error: attributesResult.error }, { status: 400 });
  }

  const samplingClient = getSamplingClient();
  let sampling;
  try {
    sampling = await samplingClient.requestAttributeSamples({
      controlId,
      testPlanId,
      attributes: attributesResult.value,
    });
  } catch (error) {
    if (error instanceof SamplingServiceError) {
      const status = error.statusCode && error.statusCode >= 400 ? error.statusCode : 502;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ error: 'Unexpected sampling error' }, { status: 500 });
  }

  try {
    const run = upsertTestRun({
      id: runId,
      controlId,
      testPlanId,
      samplePlanRef: sampling.samplePlanRef,
      samplePlanUrl: sampling.samplePlanUrl,
      status: sampling.status,
      attributes: sampling.attributes,
      requestedAt: sampling.requestedAt,
    });

    return NextResponse.json({ run }, { status: runId ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseAttributes(value: unknown):
  | { ok: true; value: SamplingAttributeRequest[] }
  | { ok: false; error: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, error: 'attributes must be a non-empty array' };
  }

  const attributes: SamplingAttributeRequest[] = [];
  for (const [index, rawAttribute] of value.entries()) {
    if (!isRecord(rawAttribute)) {
      return { ok: false, error: `Attribute at index ${index} must be an object` };
    }

    const attributeKey = typeof rawAttribute.attributeKey === 'string' ? rawAttribute.attributeKey.trim() : '';
    const population = typeof rawAttribute.population === 'number' ? rawAttribute.population : Number.NaN;
    const description = typeof rawAttribute.description === 'string' && rawAttribute.description.trim()
      ? rawAttribute.description.trim()
      : undefined;

    if (!attributeKey) {
      return { ok: false, error: `Attribute at index ${index} is missing attributeKey` };
    }

    if (!Number.isFinite(population) || population <= 0) {
      return { ok: false, error: `Attribute ${attributeKey} must include a positive population` };
    }

    attributes.push({ attributeKey, population, description });
  }

  return { ok: true, value: attributes };
}
