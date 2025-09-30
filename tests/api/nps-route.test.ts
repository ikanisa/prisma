import { describe, expect, it, vi, beforeEach } from 'vitest';

import * as supabaseServer from '../../apps/web/lib/supabase-server';

vi.mock('../../apps/web/lib/supabase-server');

const insertMock = vi.fn();
const eqMock = vi.fn();
const orderMock = vi.fn();
const limitMock = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  insertMock.mockReturnValue({ select: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'nps-1', submitted_at: '2025-01-01' }, error: null }) }) });
  eqMock.mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue(Promise.resolve({ data: [{ score: 9, feedback: 'Great', submitted_at: '2025-01-01' }], error: null })) }) });
  (supabaseServer.getServiceSupabaseClient as unknown as vi.Mock).mockResolvedValue({
    from: (table: string) => {
      if (table === 'nps_responses') {
        return {
          insert: insertMock,
          select: vi.fn().mockReturnValue({ eq: eqMock }),
        } as any;
      }
      throw new Error(`Unexpected table ${table}`);
    },
  });
});

describe('/api/analytics/nps', () => {
  it('inserts NPS response', async () => {
    const { POST } = await import('../../apps/web/app/api/analytics/nps/route');
    const response = await POST(new Request('https://example.com/api/analytics/nps', {
      method: 'POST',
      body: JSON.stringify({ orgId: 'org-1', score: 9, feedback: 'Nice experience', userId: 'user-1' }),
    }));

    expect(response.status).toBe(201);
    expect(insertMock).toHaveBeenCalled();
  });

  it('aggregates responses via GET', async () => {
    const { GET } = await import('../../apps/web/app/api/analytics/nps/route');
    const response = await GET(new Request('https://example.com/api/analytics/nps?orgId=org-1'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.summary.responses).toBe(1);
    expect(payload.summary.score).toBe(100);
  });
});
