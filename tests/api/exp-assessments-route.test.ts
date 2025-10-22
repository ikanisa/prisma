import { beforeEach, describe, expect, it, vi } from 'vitest';

const getServiceSupabaseClientMock = vi.fn();
const upsertAuditModuleRecordMock = vi.fn();
const logAuditActivityMock = vi.fn();

const ORG_ID = '90000000-0000-0000-0000-000000000001';
const ENGAGEMENT_ID = '90000000-0000-0000-0000-000000000002';
const USER_ID = '90000000-0000-0000-0000-000000000003';

vi.mock('@/lib/supabase-server', () => ({
  getServiceSupabaseClient: () => getServiceSupabaseClientMock(),
}));

vi.mock('../../apps/web/lib/supabase-server', () => ({
  getServiceSupabaseClient: () => getServiceSupabaseClientMock(),
}));

vi.mock('../../apps/web/lib/audit/module-records', () => ({
  upsertAuditModuleRecord: (...args: unknown[]) => upsertAuditModuleRecordMock(...args),
}));

vi.mock('../../apps/web/lib/audit/activity-log', () => ({
  logAuditActivity: (...args: unknown[]) => logAuditActivityMock(...args),
}));

import { POST } from '../../apps/web/app/api/exp/assessments/route';

type SupabaseStubs = {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
};

function createSupabase(options: { rateAllowed?: boolean }) {
  const upsertMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'assessment-1' }, error: null });
  const upsertSelect = vi.fn(() => ({ maybeSingle: upsertMaybeSingle }));
  const insertMock = vi.fn(() => ({ select: upsertSelect }));
  const updateMock = vi.fn(() => ({ select: upsertSelect }));

  const fromMock = vi.fn((table: string) => {
    if (table === 'specialist_assessments') {
      return {
        update: updateMock,
        insert: insertMock,
        select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })) })) })),
      };
    }
    if (table === 'idempotency_keys') {
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })) })) })) })),
        insert: vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'idempo' }, error: null }) })) })),
      };
    }
    throw new Error(`Unexpected table ${table}`);
  });

  const rpc = vi.fn().mockResolvedValue({
    data: [{ allowed: options.rateAllowed ?? true, request_count: options.rateAllowed ? 1 : 999 }],
    error: null,
  });

  return { supabase: { from: fromMock, rpc } as unknown as SupabaseStubs, spies: { insertMock, updateMock, rpc } };
}

describe('POST /api/exp/assessments', () => {
  beforeEach(() => {
    getServiceSupabaseClientMock.mockReset();
    upsertAuditModuleRecordMock.mockReset();
    logAuditActivityMock.mockReset();
  });

  it('creates a specialist assessment and logs activity', async () => {
    const { supabase } = createSupabase({ rateAllowed: true });
    getServiceSupabaseClientMock.mockReturnValue(supabase);

    const response = await POST(
      new Request('https://example.com/api/exp/assessments', {
        method: 'POST',
        body: JSON.stringify({
          orgId: ORG_ID,
          engagementId: ENGAGEMENT_ID,
          specialistKind: 'EXTERNAL_SPECIALIST',
          name: 'Valuation expert',
          userId: USER_ID,
        }),
        headers: { 'x-request-id': 'req-abc' },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ assessmentId: 'assessment-1' });
    expect(upsertAuditModuleRecordMock).toHaveBeenCalled();
    expect(logAuditActivityMock).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        orgId: ORG_ID,
        userId: USER_ID,
        entityId: 'assessment-1',
      }),
    );
  });

  it('returns 429 when rate limit exceeded', async () => {
    const { supabase } = createSupabase({ rateAllowed: false });
    getServiceSupabaseClientMock.mockReturnValue(supabase);

    const response = await POST(
      new Request('https://example.com/api/exp/assessments', {
        method: 'POST',
        body: JSON.stringify({
          orgId: ORG_ID,
          engagementId: ENGAGEMENT_ID,
          specialistKind: 'EXTERNAL_SPECIALIST',
          name: 'Valuation expert',
          userId: USER_ID,
        }),
      }),
    );

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toEqual({ error: 'rate_limit_exceeded', retryAfterSeconds: 60 });
    expect(upsertAuditModuleRecordMock).not.toHaveBeenCalled();
  });
});
