import { afterEach, describe, expect, it, vi } from 'vitest';

import { SamplingClient } from '../../apps/web/lib/audit/sampling-client';

describe('sampling client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns deterministic fixture when no service is configured', async () => {
    const client = new SamplingClient();
    const planOne = await client.requestPlan({
      orgId: 'org-1',
      engagementId: 'eng-1',
      controlId: 'control-1',
      requestedSampleSize: 30,
    });
    const planTwo = await client.requestPlan({
      orgId: 'org-1',
      engagementId: 'eng-1',
      controlId: 'control-1',
      requestedSampleSize: 30,
    });

    expect(planOne.id).toBe(planTwo.id);
    expect(planOne.items).toHaveLength(30);
    expect(planOne.source).toBe('deterministic-fixture');
    expect(planOne.items[0]?.populationRef).toBeDefined();
  });

  it('falls back to deterministic plan when the sampling service fails', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network failure')) as unknown as typeof fetch;

    const client = new SamplingClient({ baseUrl: 'https://sampling.invalid', timeoutMs: 5 });
    const plan = await client.requestPlan({
      orgId: 'org-2',
      engagementId: 'eng-2',
      controlId: 'control-2',
      requestedSampleSize: 25,
    });

    expect(plan.source).toBe('deterministic-fixture');
    expect(plan.items).toHaveLength(25);

    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      Reflect.deleteProperty(globalThis as Record<string, unknown>, 'fetch');
    }
  });
});
