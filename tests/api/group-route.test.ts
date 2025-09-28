import { beforeEach, describe, expect, it, vi } from 'vitest';

const getServiceSupabaseClientMock = vi.fn();

vi.mock('../../apps/lib/supabase-server', () => ({
  getServiceSupabaseClient: () => getServiceSupabaseClientMock(),
}));

vi.mock('../../apps/web/lib/audit/module-records', () => ({}), { virtual: true });
vi.mock('../../apps/web/lib/audit/activity-log', () => ({}), { virtual: true });
vi.mock('../../apps/web/lib/audit/evidence.ts', () => ({}), { virtual: true });

import { GET } from '../../apps/web/app/api/group/route';

function buildSupabase(rows: unknown[] = []) {
  const order = vi.fn(() => ({ data: rows, error: null }));
  const select = vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ order })) })) }));
  const from = vi.fn(() => ({ select }));
  return { client: { from } as any, spies: { select, order } };
}

describe('GET /api/group', () => {
  beforeEach(() => {
    getServiceSupabaseClientMock.mockReset();
  });

  it('requires orgId and engagementId', async () => {
    getServiceSupabaseClientMock.mockReturnValue({ from: vi.fn() });
    const response = await GET(new Request('https://example.com/api/group'));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: 'orgId and engagementId query parameters are required.' });
  });

  it('returns components and propagates request id', async () => {
    const rows = [{ id: 'comp-1' }];
    const { client } = buildSupabase(rows);
    getServiceSupabaseClientMock.mockReturnValue(client);

    const response = await GET(
      new Request('https://example.com/api/group?orgId=org-1&engagementId=eng-1', {
        headers: { 'x-request-id': 'req-123' },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ components: rows });
  });
});
