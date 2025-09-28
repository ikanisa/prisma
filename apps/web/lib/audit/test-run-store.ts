import { randomUUID } from 'crypto';
import type { ControlTestRun, SamplingAttributeResult, SamplingRunStatus } from './types';

interface UpsertTestRunInput {
  id?: string;
  controlId: string;
  testPlanId: string;
  samplePlanRef: string;
  samplePlanUrl: string;
  status: SamplingRunStatus;
  attributes: SamplingAttributeResult[];
  requestedAt: string;
}

const runs = new Map<string, ControlTestRun>();

export function upsertTestRun(input: UpsertTestRunInput): ControlTestRun {
  const timestamp = new Date().toISOString();
  if (input.id) {
    const existing = runs.get(input.id);
    if (!existing) {
      throw new Error(`Test run ${input.id} not found`);
    }

    const updated: ControlTestRun = {
      ...existing,
      controlId: input.controlId,
      testPlanId: input.testPlanId,
      samplePlanRef: input.samplePlanRef,
      samplePlanUrl: input.samplePlanUrl,
      status: input.status,
      attributes: cloneAttributes(input.attributes),
      requestedAt: input.requestedAt,
      updatedAt: timestamp,
    };
    runs.set(updated.id, updated);
    return updated;
  }

  const id = randomUUID();
  const created: ControlTestRun = {
    id,
    controlId: input.controlId,
    testPlanId: input.testPlanId,
    samplePlanRef: input.samplePlanRef,
    samplePlanUrl: input.samplePlanUrl,
    status: input.status,
    attributes: cloneAttributes(input.attributes),
    requestedAt: input.requestedAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  runs.set(id, created);
  return created;
}

export function listTestRuns(): ControlTestRun[] {
  return Array.from(runs.values()).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getTestRun(id: string): ControlTestRun | undefined {
  return runs.get(id);
}

export function resetTestRunStore() {
  runs.clear();
}

function cloneAttributes(attributes: SamplingAttributeResult[]): SamplingAttributeResult[] {
  return attributes.map(attribute => ({
    ...attribute,
    samples: attribute.samples.map(sample => ({ ...sample })),
  }));
}
