import { describe, expect, it, vi } from 'vitest';
import { SamplingClient } from '../sampling-client';
import type { SamplingPlanRequest } from '../sampling-client';

const baseRequest: SamplingPlanRequest = {
  orgId: 'org-1',
  engagementId: 'eng-1',
  controlId: 'CTRL-001',
  requestedSampleSize: 2,
};

describe('Sampling client', () => {
  it('returns deterministic fixtures when no remote service is configured', async () => {
    const client = new SamplingClient();

    const first = await client.requestPlan(baseRequest);
    const second = await client.requestPlan(baseRequest);

    expect(first).toEqual(second);
    expect(first.source).toBe('deterministic-fixture');
    expect(first.items).toHaveLength(baseRequest.requestedSampleSize);
  });

  it('delegates to the live service when configured for live mode', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'sp-123',
          sampleSize: 2,
          items: [
            { id: 'INV-1', description: 'Invoice 1' },
            { id: 'INV-2', description: 'Invoice 2' },
          ],
          generatedAt: '2024-03-01T10:00:00Z',
        }),
        { status: 200 },
      ),
    );

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as typeof globalThis.fetch;
    const client = new SamplingClient({
      baseUrl: 'https://sampling.example.com/api',
      apiKey: 'test',
    });

    const result = await client.requestPlan(baseRequest);
    globalThis.fetch = originalFetch;

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.source).toBe('service');
    expect(result.items).toHaveLength(2);
  });

  it('falls back to deterministic fixtures when the service fails', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Upstream unavailable' }), { status: 503 }),
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as typeof globalThis.fetch;
    const client = new SamplingClient({
      baseUrl: 'https://sampling.example.com/api',
      apiKey: 'test',
    });

    const fallbackPlan = await client.requestPlan(baseRequest);
    globalThis.fetch = originalFetch;

    expect(fallbackPlan.source).toBe('deterministic-fixture');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
