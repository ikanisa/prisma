import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../route';
import { setSamplingClientFactory } from '../sampling-factory';
import { resetTestRunStore } from '@/lib/audit/test-run-store';
import { SamplingServiceError } from '@/lib/audit/sampling-client';

const requestStub = vi.fn();

const baseSamplingResponse = {
  samplePlanRef: 'PLAN-123',
  samplePlanUrl: 'https://sampling.local/plans/PLAN-123',
  status: 'completed' as const,
  requestedAt: '2024-01-01T00:00:00.000Z',
  attributes: [
    {
      attributeKey: 'InvoiceNumber',
      population: 120,
      sampleSize: 5,
      status: 'sampled' as const,
      samples: [
        { recordId: 'INV-1', description: 'Invoice 1' },
        { recordId: 'INV-2', description: 'Invoice 2' },
      ],
    },
  ],
};

beforeEach(() => {
  resetTestRunStore();
  requestStub.mockReset();
  setSamplingClientFactory(() => ({
    requestAttributeSamples: requestStub,
  }));
});

describe('controls test run API', () => {
  it('persists sampling runs and exposes them through GET', async () => {
    requestStub.mockResolvedValueOnce(baseSamplingResponse);

    const request = new Request('http://localhost/api/controls/test/run', {
      method: 'POST',
      body: JSON.stringify({
        controlId: 'CTRL-1',
        testPlanId: 'TP-2025',
        attributes: [{ attributeKey: 'InvoiceNumber', population: 120 }],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const payload = (await response.json()) as { run: { id: string } };
    expect(payload.run.samplePlanRef).toBe('PLAN-123');

    const listResponse = await GET();
    const listPayload = (await listResponse.json()) as { runs: Array<{ id: string }> };
    expect(listPayload.runs).toHaveLength(1);
    expect(listPayload.runs[0]?.id).toBe(payload.run.id);
  });

  it('updates an existing run when retrying with runId', async () => {
    requestStub.mockResolvedValueOnce(baseSamplingResponse);

    const initialRequest = new Request('http://localhost/api/controls/test/run', {
      method: 'POST',
      body: JSON.stringify({
        controlId: 'CTRL-1',
        testPlanId: 'TP-2025',
        attributes: [{ attributeKey: 'InvoiceNumber', population: 120 }],
      }),
    });
    const initialResponse = await POST(initialRequest);
    const initialPayload = (await initialResponse.json()) as { run: { id: string } };

    requestStub.mockResolvedValueOnce({
      ...baseSamplingResponse,
      samplePlanRef: 'PLAN-456',
      samplePlanUrl: 'https://sampling.local/plans/PLAN-456',
      status: 'partial' as const,
    });

    const retryRequest = new Request('http://localhost/api/controls/test/run', {
      method: 'POST',
      body: JSON.stringify({
        runId: initialPayload.run.id,
        controlId: 'CTRL-1',
        testPlanId: 'TP-2025',
        attributes: [{ attributeKey: 'InvoiceNumber', population: 120 }],
      }),
    });
    const retryResponse = await POST(retryRequest);
    const retryPayload = (await retryResponse.json()) as { run: { samplePlanRef: string; status: string } };

    expect(retryResponse.status).toBe(200);
    expect(retryPayload.run.samplePlanRef).toBe('PLAN-456');
    expect(retryPayload.run.status).toBe('partial');
  });

  it('returns a 502 when the sampling client errors', async () => {
    requestStub.mockRejectedValueOnce(new SamplingServiceError('service unavailable', 503));

    const failingRequest = new Request('http://localhost/api/controls/test/run', {
      method: 'POST',
      body: JSON.stringify({
        controlId: 'CTRL-1',
        testPlanId: 'TP-2025',
        attributes: [{ attributeKey: 'InvoiceNumber', population: 120 }],
      }),
    });

    const response = await POST(failingRequest);
    expect(response.status).toBe(503);
    const payload = (await response.json()) as { error: string };
    expect(payload.error).toMatch(/service unavailable/i);
  });
});
