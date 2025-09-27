import { describe, expect, it, vi } from 'vitest';
import { createSamplingClient, SamplingServiceError } from '../sampling-client';
import type { SamplingRequest } from '../types';

const baseRequest: SamplingRequest = {
  controlId: 'CTRL-001',
  testPlanId: 'TP-2025',
  attributes: [
    { attributeKey: 'InvoiceNumber', population: 120 },
    { attributeKey: 'Approval', population: 45 },
  ],
};

describe('Sampling client', () => {
  it('returns deterministic fixtures when running in demo mode', async () => {
    const now = new Date('2024-01-01T00:00:00Z');
    const client = createSamplingClient({ mode: 'demo', now: () => now });

    const first = await client.requestAttributeSamples(baseRequest);
    const second = await client.requestAttributeSamples(baseRequest);

    expect(first).toEqual(second);
    expect(first.samplePlanRef).toMatch(/^DEMO-/);
    expect(first.status).toBeDefined();
    expect(first.attributes.every(attribute => attribute.samples.length === (attribute.status === 'sampled' ? attribute.sampleSize : 0))).toBe(true);
  });

  it('delegates to the live service when configured for live mode', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          samplePlanRef: 'SP-12345',
          samplePlanUrl: 'https://sampling.example.com/plans/SP-12345',
          status: 'partial',
          requestedAt: '2024-03-01T10:00:00Z',
          attributes: [
            {
              attributeKey: 'InvoiceNumber',
              population: 120,
              sampleSize: 5,
              status: 'sampled',
              samples: [
                { recordId: 'INV-1', description: 'Invoice 1' },
                { recordId: 'INV-2', description: 'Invoice 2' },
              ],
            },
            {
              attributeKey: 'Approval',
              population: 45,
              sampleSize: 3,
              status: 'failed',
              error: 'Insufficient supporting evidence',
              samples: [],
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const client = createSamplingClient({
      mode: 'live',
      baseUrl: 'https://sampling.example.com/api',
      fetch: fetchSpy,
      now: () => new Date('2024-03-01T11:00:00Z'),
    });

    const result = await client.requestAttributeSamples(baseRequest);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toContain('/controls/CTRL-001/test-plans/TP-2025/samples');
    expect(result.samplePlanRef).toBe('SP-12345');
    expect(result.status).toBe('partial');
    expect(result.attributes).toHaveLength(2);
  });

  it('raises a SamplingServiceError when the service fails', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Upstream unavailable' }), { status: 503 }),
    );

    const client = createSamplingClient({
      mode: 'live',
      baseUrl: 'https://sampling.example.com/api',
      fetch: fetchSpy,
    });

    await expect(client.requestAttributeSamples(baseRequest)).rejects.toBeInstanceOf(SamplingServiceError);
  });
});
