import { beforeEach, describe, expect, it, vi } from 'vitest';

const getServiceSupabaseClientMock = vi.fn();
const queueManagerReviewMock = vi.fn();
const buildEvidenceManifestMock = vi.fn();

vi.mock('../../apps/lib/supabase-server', () => ({
  getServiceSupabaseClient: () => getServiceSupabaseClientMock(),
}));

vi.mock('../../apps/web/lib/supabase-server', () => ({
  getServiceSupabaseClient: () => getServiceSupabaseClientMock(),
}));

vi.mock('../../apps/web/lib/audit/approvals', () => ({
  queueManagerReview: (...args: unknown[]) => queueManagerReviewMock(...args),
}));

vi.mock('../../apps/web/lib/audit/evidence', () => ({
  buildEvidenceManifest: (...args: unknown[]) => buildEvidenceManifestMock(...args),
}));

import { POST } from '../../apps/web/app/api/exp/assessments/conclude/route';

const ORG_ID = '91000000-0000-0000-0000-000000000001';
const ENGAGEMENT_ID = '91000000-0000-0000-0000-000000000002';
const ASSESSMENT_ID = '91000000-0000-0000-0000-000000000003';
const USER_ID = '91000000-0000-0000-0000-000000000004';

type SupabaseStub = { from: ReturnType<typeof vi.fn>; rpc: ReturnType<typeof vi.fn> };

function createSupabase(options: { rateAllowed?: boolean }) {
  const updateMaybeSingle = vi.fn().mockResolvedValue({
    data: { id: ASSESSMENT_ID, prepared_by_user_id: USER_ID },
    error: null,
  });
  const update = vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle: updateMaybeSingle })) })) })) }));

  const fromMock = vi.fn((table: string) => {
    if (table === 'specialist_assessments') {
      return { update };
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

  return { supabase: { from: fromMock, rpc } as unknown as SupabaseStub, spies: { updateMaybeSingle, rpc } };
}

describe('POST /api/exp/assessments/conclude', () => {
  beforeEach(() => {
    getServiceSupabaseClientMock.mockReset();
    queueManagerReviewMock.mockReset();
    buildEvidenceManifestMock.mockReturnValue({ id: 'manifest' });
  });

  it('updates conclusion and queues manager review', async () => {
    const { supabase } = createSupabase({ rateAllowed: true });
    getServiceSupabaseClientMock.mockReturnValue(supabase);

    const response = await POST(
      new Request('https://example.com/api/exp/assessments/conclude', {
        method: 'POST',
        body: JSON.stringify({
          orgId: ORG_ID,
          engagementId: ENGAGEMENT_ID,
          assessmentId: ASSESSMENT_ID,
          conclusion: 'RELIED',
          userId: USER_ID,
        }),
        headers: { 'x-request-id': 'req-conclude' },
      }),
    );

    expect(response.status).toBe(200);
    expect(queueManagerReviewMock).toHaveBeenCalled();
  });

  it('returns 429 when rate limit exceeded', async () => {
    const { supabase } = createSupabase({ rateAllowed: false });
    getServiceSupabaseClientMock.mockReturnValue(supabase);

    const response = await POST(
      new Request('https://example.com/api/exp/assessments/conclude', {
        method: 'POST',
        body: JSON.stringify({
          orgId: ORG_ID,
          engagementId: ENGAGEMENT_ID,
          assessmentId: ASSESSMENT_ID,
          conclusion: 'RELIED',
          userId: USER_ID,
        }),
      }),
    );

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toEqual({ error: 'rate_limit_exceeded', retryAfterSeconds: 60 });
    expect(queueManagerReviewMock).not.toHaveBeenCalled();
  });
});
