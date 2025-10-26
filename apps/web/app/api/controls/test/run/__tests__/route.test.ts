import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SamplingPlan } from '@/lib/audit/sampling-client';
import { GET, POST } from '../route';
import { resetTestRunStore } from '@/lib/audit/test-run-store';
import { SamplingServiceError } from '@/lib/audit/sampling-client';

const requestStub = vi.fn();

const buildQueryChain = () => {
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
  };
  return chain;
};

const supabaseStub = {
  rpc: vi.fn(async () => ({ data: [{ allowed: true, request_count: 0 }], error: null })),
  from: vi.fn(() => buildQueryChain()),
};

const baseSamplingPlan: SamplingPlan = {
  id: 'PLAN-123',
  size: 1,
  generatedAt: '2024-01-01T00:00:00.000Z',
  source: 'service',
  items: [
    {
      id: 'INV-1',
      populationRef: 'https://sampling.local/plans/PLAN-123',
      description: 'Invoice 1',
    },
  ],
};

vi.mock('@/lib/supabase-server', () => ({
  getServiceSupabaseClient: vi.fn(async () => supabaseStub),
}));

vi.mock('@/lib/audit/sampling-client', () => {
  class MockSamplingServiceError extends Error {
    statusCode?: number;
    constructor(message: string, statusCode?: number) {
      super(message);
      this.name = 'SamplingServiceError';
      this.statusCode = statusCode;
    }
  }

  return {
    getSamplingClient: () => ({
      requestPlan: requestStub,
    }),
    SamplingServiceError: MockSamplingServiceError,
  };
});

beforeEach(() => {
  resetTestRunStore();
  requestStub.mockReset();
  supabaseStub.rpc.mockClear();
  supabaseStub.from.mockClear();
});

describe('controls test run API', () => {
  it('persists sampling runs and exposes them through GET', async () => {
    requestStub.mockResolvedValueOnce(baseSamplingPlan);

    const request = new Request('http://localhost/api/controls/test/run', {
      method: 'POST',
      body: JSON.stringify({
        orgId: 'org-1',
        engagementId: 'eng-1',
        controlId: 'CTRL-1',
        userId: 'user-1',
        testPlanId: 'TP-2025',
        attributes: [{ attributeKey: 'InvoiceNumber', population: 120 }],
        result: 'PASS',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const payload = (await response.json()) as { run: { id: string; samplePlanRef: string } };
    expect(payload.run.samplePlanRef).toBe('PLAN-123');

    const listResponse = await GET(new Request('http://localhost/api/controls/test/run'));
    const listPayload = (await listResponse.json()) as { runs: Array<{ id: string }> };
    expect(listPayload.runs).toHaveLength(1);
    expect(listPayload.runs[0]?.id).toBe(payload.run.id);
  });

  it('updates an existing run when retrying with runId', async () => {
    requestStub.mockResolvedValueOnce(baseSamplingPlan);

    const initialRequest = new Request('http://localhost/api/controls/test/run', {
      method: 'POST',
      body: JSON.stringify({
        orgId: 'org-1',
        engagementId: 'eng-1',
        controlId: 'CTRL-1',
        userId: 'user-1',
        testPlanId: 'TP-2025',
        attributes: [{ attributeKey: 'InvoiceNumber', population: 120 }],
        result: 'PASS',
      }),
    });
    const initialResponse = await POST(initialRequest);
    const initialPayload = (await initialResponse.json()) as { run: { id: string } };

    requestStub.mockResolvedValueOnce({
      ...baseSamplingPlan,
      id: 'PLAN-456',
      source: 'deterministic-fixture',
      items: [
        {
          id: 'INV-2',
          populationRef: 'https://sampling.local/plans/PLAN-456',
          description: 'Invoice 2',
        },
      ],
    });

    const retryRequest = new Request('http://localhost/api/controls/test/run', {
      method: 'POST',
      body: JSON.stringify({
        orgId: 'org-1',
        engagementId: 'eng-1',
        controlId: 'CTRL-1',
        userId: 'user-1',
        testPlanId: 'TP-2025',
        attributes: [{ attributeKey: 'InvoiceNumber', population: 120 }],
        result: 'PASS',
        runId: initialPayload.run.id,
      }),
    });
    const retryResponse = await POST(retryRequest);
    const retryPayload = (await retryResponse.json()) as { run: { samplePlanRef: string; status: string } };

    expect(retryResponse.status).toBe(200);
    expect(retryPayload.run.samplePlanRef).toBe('PLAN-456');
    expect(retryPayload.run.status).toBe('partial');
  });

  it('returns a 503 when the sampling client errors', async () => {
    requestStub.mockRejectedValueOnce(new SamplingServiceError('service unavailable', 503));

    const failingRequest = new Request('http://localhost/api/controls/test/run', {
      method: 'POST',
      body: JSON.stringify({
        orgId: 'org-1',
        engagementId: 'eng-1',
        controlId: 'CTRL-1',
        userId: 'user-1',
        testPlanId: 'TP-2025',
        attributes: [{ attributeKey: 'InvoiceNumber', population: 120 }],
        result: 'PASS',
      }),
    });

    const response = await POST(failingRequest);
    expect(response.status).toBe(503);
    const payload = (await response.json()) as { error: string };
    expect(payload.error).toMatch(/service unavailable/i);
  });
});
