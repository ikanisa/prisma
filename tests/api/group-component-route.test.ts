import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installRateLimitFetchMock, type RateLimitFetchMock } from './helpers/rate-limit';

const getServiceSupabaseClientMock = vi.fn();
const upsertAuditModuleRecordMock = vi.fn();
const logAuditActivityMock = vi.fn();

const ORG_ID = '10000000-0000-0000-0000-000000000001';
const ENGAGEMENT_ID = '10000000-0000-0000-0000-000000000002';
const USER_ID = '10000000-0000-0000-0000-000000000003';

vi.mock('../../apps/lib/supabase-server', () => ({
  getServiceSupabaseClient: () => getServiceSupabaseClientMock(),
}));

vi.mock('../../apps/web/lib/supabase-server', () => ({
  getServiceSupabaseClient: () => getServiceSupabaseClientMock(),
}));

vi.mock('../../apps/lib/audit/module-records', () => ({
  upsertAuditModuleRecord: (...args: unknown[]) => upsertAuditModuleRecordMock(...args),
}));

vi.mock('../../apps/web/lib/audit/module-records', () => ({
  upsertAuditModuleRecord: (...args: unknown[]) => upsertAuditModuleRecordMock(...args),
}));

vi.mock('../../apps/lib/audit/activity-log', () => ({
  logAuditActivity: (...args: unknown[]) => logAuditActivityMock(...args),
}));

vi.mock('../../apps/web/lib/audit/activity-log', () => ({
  logAuditActivity: (...args: unknown[]) => logAuditActivityMock(...args),
}));

import { POST } from '../../apps/web/app/api/group/component/route';

function createSupabase(rateAllowed = true) {
  const insertedRow = {
    id: '20000000-0000-0000-0000-000000000004',
    org_id: ORG_ID,
    engagement_id: ENGAGEMENT_ID,
    name: 'Subsidiary Test',
    country: 'MT',
    significance: 'KEY',
    materiality: 125000,
    assigned_firm: 'Local Firm',
    notes: 'Focus on revenue recognition.',
  };

  const insertMaybeSingle = vi.fn().mockResolvedValue({ data: insertedRow, error: null });
  const insertSelect = vi.fn(() => ({ maybeSingle: insertMaybeSingle }));
  const insertMock = vi.fn(() => ({ select: insertSelect }));

  const fromMock = vi.fn((table: string) => {
    if (table === 'group_components') {
      return { insert: insertMock };
    }
    throw new Error(`Unexpected table ${table}`);
  });

  const rpc = vi.fn().mockResolvedValue({ data: [{ allowed: rateAllowed, request_count: 1 }], error: null });

  return {
    supabase: { from: fromMock, rpc } as Record<string, unknown>,
    spies: { insertMock, insertSelect, insertMaybeSingle, rpc },
    insertedRow,
  };
}

describe('POST /api/group/component', () => {
  let rateLimitMock: RateLimitFetchMock;

  beforeEach(() => {
    getServiceSupabaseClientMock.mockReset();
    upsertAuditModuleRecordMock.mockReset();
    logAuditActivityMock.mockReset();
    rateLimitMock = installRateLimitFetchMock();
  });

  afterEach(() => {
    rateLimitMock.restore();
  });

  it('creates a group component and records audit metadata', async () => {
    const { supabase, insertedRow } = createSupabase();
    getServiceSupabaseClientMock.mockReturnValue(supabase);

    const response = await POST(
      new Request('https://example.com/api/group/component', {
        method: 'POST',
        body: JSON.stringify({
          orgId: ORG_ID,
          engagementId: ENGAGEMENT_ID,
          userId: USER_ID,
          name: 'Subsidiary Test',
          country: 'MT',
          significance: 'KEY',
          materiality: 125000,
          assignedFirm: 'Local Firm',
          notes: 'Focus on revenue recognition.',
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ component: insertedRow });

    expect(upsertAuditModuleRecordMock).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        orgId: ORG_ID,
        engagementId: ENGAGEMENT_ID,
        moduleCode: 'GRP1',
        recordRef: insertedRow.id,
        title: `${insertedRow.name} component`,
        recordStatus: 'IN_PROGRESS',
        approvalState: 'DRAFT',
        currentStage: 'PREPARER',
        preparedByUserId: USER_ID,
        ownerUserId: USER_ID,
        metadata: {
          country: insertedRow.country,
          significance: insertedRow.significance,
          materiality: insertedRow.materiality,
        },
        userId: USER_ID,
      }),
    );

    expect(logAuditActivityMock).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        orgId: ORG_ID,
        userId: USER_ID,
        action: 'GRP_COMPONENT_CREATED',
        entityType: 'AUDIT_GROUP',
        entityId: insertedRow.id,
        metadata: expect.objectContaining({
          country: insertedRow.country,
          significance: insertedRow.significance,
          materiality: insertedRow.materiality,
          assignedFirm: insertedRow.assigned_firm,
        }),
      }),
    );
  });

  it('returns 429 when rate limit exceeded', async () => {
    const { supabase } = createSupabase(false);
    getServiceSupabaseClientMock.mockReturnValue(supabase);
    rateLimitMock.setRateLimit({ allowed: false, requestCount: 999 });

    const response = await POST(
      new Request('https://example.com/api/group/component', {
        method: 'POST',
        body: JSON.stringify({
          orgId: ORG_ID,
          engagementId: ENGAGEMENT_ID,
          userId: USER_ID,
          name: 'Subsidiary Test',
        }),
      }),
    );

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toEqual({ error: 'rate_limit_exceeded', retryAfterSeconds: 60 });
  });
});
