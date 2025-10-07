import { describe, expect, it, vi, beforeEach } from 'vitest';

import * as supabaseServer from '../../apps/web/lib/supabase-server';

vi.mock('../../apps/web/lib/supabase-server');

type ChainResult = { data: unknown };

function buildChain(result: ChainResult) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue(Promise.resolve(result)),
        }),
      }),
    }),
  };
}

describe('GET /api/analytics/overview', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns aggregated analytics payload', async () => {
    const coverageChain = buildChain({
      data: [{
        module: 'Audit',
        metric: 'Evidence',
        coverage_ratio: 0.92,
        measured_value: 92,
        population: 100,
        computed_at: '2025-01-01',
        period_start: '2024-12-01',
        period_end: '2024-12-31',
      }],
    });
    const slaChain = buildChain({
      data: [{
        module: 'Audit',
        workflow_event: 'Review',
        status: 'ON_TRACK',
        open_breaches: 0,
        target_hours: 24,
        computed_at: '2025-01-01',
      }],
    });
    const jobsChain = buildChain({
      data: [{
        status: 'DONE',
        kind: 'refresh_analytics',
        scheduled_at: '2025-01-01T00:00:00Z',
        finished_at: '2025-01-01T00:00:10Z',
      }],
    });
    const npsChain = buildChain({
      data: [{ score: 10, feedback: 'Great!', submitted_at: '2025-01-01' }],
    });

    (supabaseServer.getServiceSupabaseClient as unknown as vi.Mock).mockResolvedValue({
      from: (table: string) => {
        switch (table) {
          case 'telemetry_coverage_metrics':
            return coverageChain;
          case 'telemetry_service_levels':
            return slaChain;
          case 'jobs':
            return jobsChain;
          case 'nps_responses':
            return npsChain;
          default:
            throw new Error(`Unexpected table ${table}`);
        }
      },
    });

    const { GET } = await import('../../apps/web/app/api/analytics/overview/route');
    const response = await GET(new Request('https://example.com/api/analytics/overview?orgId=org-1', {
      headers: { 'x-request-id': 'trace-123' },
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.traceId).toBe('trace-123');
    expect(payload.coverage).toHaveLength(1);
    expect(payload.jobs.totalRuns).toBe(1);
    expect(payload.nps.responses).toHaveLength(1);
  });
});
