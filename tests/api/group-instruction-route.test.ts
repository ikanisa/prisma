import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installRateLimitFetchMock, type RateLimitFetchMock } from './helpers/rate-limit';
const getServiceSupabaseClientMock = vi.fn();
const upsertAuditModuleRecordMock = vi.fn();
const ensureAuditRecordApprovalStageMock = vi.fn();
const logAuditActivityMock = vi.fn();

const ORG_ID = '00000000-0000-0000-0000-000000000001';
const ENGAGEMENT_ID = '00000000-0000-0000-0000-000000000002';
const COMPONENT_ID = '00000000-0000-0000-0000-000000000003';
const USER_ID = '00000000-0000-0000-0000-000000000004';

vi.mock('@/lib/supabase-server', () => ({
  getServiceSupabaseClient: () => getServiceSupabaseClientMock(),
}));

vi.mock('../../apps/web/lib/supabase-server', () => ({
  getServiceSupabaseClient: () => getServiceSupabaseClientMock(),
}));

vi.mock('../../apps/lib/audit/module-records', () => ({
  upsertAuditModuleRecord: (...args: unknown[]) => upsertAuditModuleRecordMock(...args),
  ensureAuditRecordApprovalStage: (...args: unknown[]) => ensureAuditRecordApprovalStageMock(...args),
}));

vi.mock('../../apps/web/lib/audit/module-records', () => ({
  upsertAuditModuleRecord: (...args: unknown[]) => upsertAuditModuleRecordMock(...args),
  ensureAuditRecordApprovalStage: (...args: unknown[]) => ensureAuditRecordApprovalStageMock(...args),
}));

vi.mock('../../apps/lib/audit/activity-log', () => ({
  logAuditActivity: (...args: unknown[]) => logAuditActivityMock(...args),
}));

vi.mock('../../apps/web/lib/audit/activity-log', () => ({
  logAuditActivity: (...args: unknown[]) => logAuditActivityMock(...args),
}));

import { POST } from '../../apps/web/app/api/group/instruction/route';

function createSupabase(options: {
  component?: Record<string, unknown> | null;
  instruction?: Record<string, unknown>;
  rateAllowed?: boolean;
}) {
  const componentRow = 'component' in options ? options.component ?? null : { id: COMPONENT_ID };
  const instructionRow =
    options.instruction ??
    ({
      id: '00000000-0000-0000-0000-000000000005',
      status: 'SENT',
      due_at: '2025-01-31T00:00:00Z',
    } as Record<string, unknown>);

  const componentMaybeSingle = vi.fn().mockResolvedValue({ data: componentRow, error: null });
  const componentEqOrg = vi.fn(() => ({ maybeSingle: componentMaybeSingle }));
  const componentEqId = vi.fn(() => ({ eq: componentEqOrg }));
  const componentSelect = vi.fn(() => ({ eq: componentEqId }));

  const instructionMaybeSingle = vi.fn().mockResolvedValue({ data: instructionRow, error: null });
  const instructionSelect = vi.fn(() => ({ maybeSingle: instructionMaybeSingle }));
  const instructionInsert = vi.fn(() => ({ select: instructionSelect }));

  const fromMock = vi.fn((table: string) => {
    if (table === 'group_components') {
      return { select: componentSelect };
    }
    if (table === 'group_instructions') {
      return { insert: instructionInsert };
    }
    throw new Error(`Unexpected table ${table}`);
  });

  const rpc = vi.fn().mockResolvedValue({ data: [{ allowed: options.rateAllowed ?? true, request_count: 1 }], error: null });

  return {
    supabase: { from: fromMock, rpc } as Record<string, unknown>,
    spies: {
      componentMaybeSingle,
      componentEqOrg,
      componentEqId,
      componentSelect,
      instructionMaybeSingle,
      instructionInsert,
      instructionSelect,
      rpc,
    },
    instructionRow,
  };
}

describe('POST /api/group/instruction', () => {
  let rateLimitMock: RateLimitFetchMock;

  beforeEach(() => {
    getServiceSupabaseClientMock.mockReset();
    upsertAuditModuleRecordMock.mockReset();
    ensureAuditRecordApprovalStageMock.mockReset();
    logAuditActivityMock.mockReset();
    rateLimitMock = installRateLimitFetchMock();
  });

  afterEach(() => {
    rateLimitMock.restore();
  });

  it('records an instruction and updates audit module metadata', async () => {
    const { supabase, instructionRow } = createSupabase({
      instruction: {
        id: '00000000-0000-0000-0000-000000000006',
        status: 'SENT',
        due_at: '2025-02-10T00:00:00Z',
      },
    });
    getServiceSupabaseClientMock.mockReturnValue(supabase);

    const response = await POST(
      new Request('https://example.com/api/group/instruction', {
        method: 'POST',
        body: JSON.stringify({
          orgId: ORG_ID,
          engagementId: ENGAGEMENT_ID,
          componentId: COMPONENT_ID,
          userId: USER_ID,
          title: 'Provide rollforward testing',
          status: 'SENT',
          dueAt: '2025-02-10T00:00:00Z',
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ instruction: instructionRow });

    expect(upsertAuditModuleRecordMock).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        recordRef: COMPONENT_ID,
        moduleCode: 'GRP1',
        recordStatus: 'IN_PROGRESS',
        approvalState: 'DRAFT',
        metadata: {
          instructionId: '00000000-0000-0000-0000-000000000006',
          instructionStatus: 'SENT',
          dueAt: '2025-02-10T00:00:00Z',
        },
        updatedByUserId: USER_ID,
      }),
    );

    expect(ensureAuditRecordApprovalStageMock).not.toHaveBeenCalled();
    expect(logAuditActivityMock).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        orgId: ORG_ID,
        userId: USER_ID,
        action: 'GRP_INSTRUCTION_SENT',
        entityType: 'AUDIT_GROUP',
        entityId: '00000000-0000-0000-0000-000000000006',
        metadata: expect.objectContaining({
          componentId: COMPONENT_ID,
          status: 'SENT',
          dueAt: '2025-02-10T00:00:00Z',
        }),
      }),
    );
  });

  it('queues manager approval when instruction completes', async () => {
    const { supabase, instructionRow } = createSupabase({
      instruction: {
        id: '00000000-0000-0000-0000-000000000007',
        status: 'COMPLETE',
        due_at: '2025-03-01T00:00:00Z',
      },
    });
    getServiceSupabaseClientMock.mockReturnValue(supabase);

    const response = await POST(
      new Request('https://example.com/api/group/instruction', {
        method: 'POST',
        body: JSON.stringify({
          orgId: ORG_ID,
          engagementId: ENGAGEMENT_ID,
          componentId: COMPONENT_ID,
          userId: USER_ID,
          title: 'Submit component summary',
          status: 'COMPLETE',
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ instruction: instructionRow });

    expect(upsertAuditModuleRecordMock).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        recordStatus: 'READY_FOR_REVIEW',
        metadata: expect.objectContaining({ instructionStatus: 'COMPLETE' }),
        updatedByUserId: USER_ID,
      }),
    );

    expect(ensureAuditRecordApprovalStageMock).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        moduleCode: 'GRP1',
        recordRef: COMPONENT_ID,
        stage: 'MANAGER',
        decision: 'PENDING',
        metadata: { instructionId: '00000000-0000-0000-0000-000000000007' },
        userId: USER_ID,
      }),
    );

    expect(logAuditActivityMock).toHaveBeenCalledWith(supabase, expect.objectContaining({ action: 'GRP_INSTRUCTION_COMPLETED' }));
  });

  it('returns 404 when the component is missing', async () => {
    const { supabase } = createSupabase({ component: null });
    getServiceSupabaseClientMock.mockReturnValue(supabase);

    const response = await POST(
      new Request('https://example.com/api/group/instruction', {
        method: 'POST',
        body: JSON.stringify({
          orgId: ORG_ID,
          engagementId: ENGAGEMENT_ID,
          componentId: COMPONENT_ID,
          userId: USER_ID,
          title: 'Review controls',
        }),
      }),
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: 'Group component not found.' });
  });

  it('returns 429 when rate limit exceeded', async () => {
    const { supabase } = createSupabase({ rateAllowed: false });
    getServiceSupabaseClientMock.mockReturnValue(supabase);
    rateLimitMock.setRateLimit({ allowed: false, requestCount: 999 });

    const response = await POST(
      new Request('https://example.com/api/group/instruction', {
        method: 'POST',
        body: JSON.stringify({
          orgId: ORG_ID,
          engagementId: ENGAGEMENT_ID,
          componentId: COMPONENT_ID,
          userId: USER_ID,
          title: 'Instruction',
        }),
      }),
    );

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toEqual({ error: 'rate_limit_exceeded', retryAfterSeconds: 60 });
  });
});
