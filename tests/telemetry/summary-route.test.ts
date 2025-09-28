import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(data), {
        status: init?.status ?? 200,
        headers: { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string> | undefined) },
      }),
  },
}));

const tableResults: Record<string, { data: any; error: any }> = {};
const limitCalls: Record<string, number[]> = {};

const fromMock = vi.fn((table: string) => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn((value: number) => {
      limitCalls[table] = [...(limitCalls[table] ?? []), value];
      const result = tableResults[table];
      return Promise.resolve({
        data: result?.data ?? [],
        error: result?.error ?? null,
      });
    }),
  };
  return builder;
});

vi.mock('../../apps/web/lib/supabase-server', () => ({
  getServiceSupabaseClient: () => ({ from: fromMock }),
}));

import { GET } from '../../apps/web/app/api/telemetry/summary/route';

beforeEach(() => {
  fromMock.mockClear();
  Object.keys(tableResults).forEach((key) => delete tableResults[key]);
  Object.keys(limitCalls).forEach((key) => delete limitCalls[key]);
});

describe('GET /api/telemetry/summary', () => {
  it('requires an orgId parameter', async () => {
    const response = await GET(new Request('https://example.com/api/telemetry/summary'));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: 'orgId query parameter is required.' });
  });

  it('returns telemetry aggregates with unique coverage and SLA entries', async () => {
    tableResults.telemetry_coverage_metrics = {
      data: [
        {
          module: 'ACCOUNTING_CLOSE',
          metric: 'close_checklist',
          measured_value: 10,
          population: 10,
          coverage_ratio: 1,
          period_start: '2025-01-01',
          period_end: '2025-01-31',
          computed_at: '2025-01-31T00:00:00Z',
        },
        {
          module: 'ACCOUNTING_CLOSE',
          metric: 'close_checklist',
          measured_value: 8,
          population: 12,
          period_start: '2025-01-01',
          period_end: '2025-01-31',
          computed_at: '2025-01-31T00:00:00Z',
        },
        {
          module: 'TAX_OVERLAY',
          metric: 'overlay_calculations',
          measured_value: 3,
          population: 5,
          period_start: '2025-01-01',
          period_end: '2025-01-31',
          computed_at: '2025-01-31T00:00:00Z',
        },
      ],
      error: null,
    };

    tableResults.telemetry_service_levels = {
      data: [
        {
          module: 'ACCOUNTING_CLOSE',
          workflow_event: 'CLOSE_PERIOD',
          status: 'ON_TRACK',
          open_breaches: 0,
          target_hours: 24,
          computed_at: '2025-01-31T00:00:00Z',
        },
        {
          module: 'ACCOUNTING_CLOSE',
          workflow_event: 'CLOSE_PERIOD',
          status: 'BREACHED',
          open_breaches: 1,
          target_hours: 24,
          computed_at: '2025-01-31T00:00:00Z',
        },
      ],
      error: null,
    };

    tableResults.telemetry_refusal_events = {
      data: [
        {
          module: 'TAX_OVERLAY',
          event: 'REQUEST_OVERRIDE',
          reason: 'Manual check required',
          severity: 'HIGH',
          count: 2,
          occurred_at: '2025-01-28T08:30:00Z',
        },
      ],
      error: null,
    };

    const response = await GET(new Request('https://example.com/api/telemetry/summary?orgId=org-1&limit=200'));

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.coverage).toHaveLength(2);
    expect(body.coverage[0]).toMatchObject({ module: 'ACCOUNTING_CLOSE', metric: 'close_checklist' });
    expect(body.serviceLevels).toHaveLength(1);
    expect(body.refusals).toEqual(tableResults.telemetry_refusal_events.data);

    expect(limitCalls.telemetry_coverage_metrics).toEqual([100]);
    expect(limitCalls.telemetry_service_levels).toEqual([100]);
    expect(limitCalls.telemetry_refusal_events).toEqual([100]);
  });

  it('surfaces query failures as a 500 response', async () => {
    tableResults.telemetry_coverage_metrics = { data: [], error: { message: 'db_down' } };

    const response = await GET(new Request('https://example.com/api/telemetry/summary?orgId=org-1'));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'telemetry_query_failed' });
  });
});
