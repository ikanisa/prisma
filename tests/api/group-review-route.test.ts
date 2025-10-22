import { beforeEach, describe, expect, it, vi } from 'vitest';

const getServiceSupabaseClientMock = vi.fn();
const upsertAuditModuleRecordMock = vi.fn();
const ensureAuditRecordApprovalStageMock = vi.fn();
const logAuditActivityMock = vi.fn();

const ORG_ID = '30000000-0000-0000-0000-000000000001';
const ENGAGEMENT_ID = '30000000-0000-0000-0000-000000000002';
const COMPONENT_ID = '30000000-0000-0000-0000-000000000003';
const USER_ID = '30000000-0000-0000-0000-000000000004';
const REVIEWER_ID = '30000000-0000-0000-0000-000000000005';

vi.mock('@/lib/supabase-server', () => ({
  getServiceSupabaseClient: () => getServiceSupabaseClientMock(),
}));

vi.mock('@/lib/audit/module-records', () => ({
  upsertAuditModuleRecord: (...args: unknown[]) => upsertAuditModuleRecordMock(...args),
  ensureAuditRecordApprovalStage: (...args: unknown[]) => ensureAuditRecordApprovalStageMock(...args),
}));

vi.mock('@/lib/audit/activity-log', () => ({
  logAuditActivity: (...args: unknown[]) => logAuditActivityMock(...args),
}));

import { POST } from '../../apps/web/app/api/group/review/route';

type SupabaseStub = { from: ReturnType<typeof vi.fn> };

type SupabaseOptions = {
  existingReview?: Record<string, unknown> | null;
  updateResult?: Record<string, unknown>;
  insertResult?: Record<string, unknown>;
};

function createSupabase(options: SupabaseOptions & { rateAllowed?: boolean }) {
  const existingReview = options.existingReview ?? null;

  const fetchMaybeSingle = vi.fn().mockResolvedValue({ data: existingReview, error: null });
  const fetchBuilder = {
    select: vi.fn(() => fetchBuilder),
    eq: vi.fn(() => fetchBuilder),
    maybeSingle: fetchMaybeSingle,
  };

  const updateResult = options.updateResult ?? existingReview ?? { id: 'review-updated' };
  const updateMaybeSingle = vi.fn().mockResolvedValue({ data: updateResult, error: null });
  const updateSelect = vi.fn(() => ({ maybeSingle: updateMaybeSingle }));
  const updateEq = vi.fn(() => ({ select: updateSelect }));
  const updateMock = vi.fn(() => ({ eq: updateEq }));

  const insertResult = options.insertResult ?? { id: 'review-inserted' };
  const insertMaybeSingle = vi.fn().mockResolvedValue({ data: insertResult, error: null });
  const insertSelect = vi.fn(() => ({ maybeSingle: insertMaybeSingle }));
  const insertMock = vi.fn(() => ({ select: insertSelect }));

  const fromMock = vi.fn((table: string) => {
    if (table === 'group_reviews') {
      return {
        select: fetchBuilder.select,
        update: updateMock,
        insert: insertMock,
      };
    }
    throw new Error(`Unexpected table ${table}`);
  });

  const rpc = vi.fn().mockResolvedValue({ data: [{ allowed: options.rateAllowed ?? true, request_count: 1 }], error: null });
  const supabase = { from: fromMock, rpc } as unknown as SupabaseStub;

  return {
    supabase,
    spies: {
      fetchBuilder,
      updateMock,
      updateEq,
      updateSelect,
      updateMaybeSingle,
      insertMock,
      insertSelect,
      insertMaybeSingle,
      rpc,
    },
    insertResult,
  };
}

describe('POST /api/group/review', () => {
  beforeEach(() => {
    getServiceSupabaseClientMock.mockReset();
    upsertAuditModuleRecordMock.mockReset();
    ensureAuditRecordApprovalStageMock.mockReset();
    logAuditActivityMock.mockReset();
  });

  it('updates an existing review and logs progress', async () => {
    const existingReview = { id: '40000000-0000-0000-0000-000000000010' };
    const { supabase } = createSupabase({ existingReview });
    getServiceSupabaseClientMock.mockReturnValue(supabase);

    const response = await POST(
      new Request('https://example.com/api/group/review', {
        method: 'POST',
        body: JSON.stringify({
          orgId: ORG_ID,
          engagementId: ENGAGEMENT_ID,
          componentId: COMPONENT_ID,
          reviewerUserId: REVIEWER_ID,
          status: 'IN_PROGRESS',
          notes: 'Review started',
          userId: USER_ID,
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true, reviewId: existingReview.id });

    expect(upsertAuditModuleRecordMock).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        orgId: ORG_ID,
        engagementId: ENGAGEMENT_ID,
        moduleCode: 'GRP1',
        recordRef: COMPONENT_ID,
        title: 'Component review',
        recordStatus: 'IN_PROGRESS',
        approvalState: 'DRAFT',
        currentStage: 'PREPARER',
        currentReviewerUserId: REVIEWER_ID,
        metadata: expect.objectContaining({
          reviewStatus: 'IN_PROGRESS',
          notes: 'Review started',
        }),
        updatedByUserId: USER_ID,
      }),
    );

    expect(ensureAuditRecordApprovalStageMock).not.toHaveBeenCalled();

    expect(logAuditActivityMock).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        orgId: ORG_ID,
        userId: USER_ID,
        action: 'GRP_REVIEW_UPDATED',
        entityType: 'AUDIT_GROUP',
        entityId: existingReview.id,
        metadata: expect.objectContaining({
          componentId: COMPONENT_ID,
          status: 'IN_PROGRESS',
          reviewerUserId: REVIEWER_ID,
        }),
      }),
    );
  });

  it('creates a new review and queues manager approval when complete', async () => {
    const newReview = { id: '40000000-0000-0000-0000-000000000011' };
    const { supabase } = createSupabase({ existingReview: null, insertResult: newReview });
    getServiceSupabaseClientMock.mockReturnValue(supabase);

    const response = await POST(
      new Request('https://example.com/api/group/review', {
        method: 'POST',
        body: JSON.stringify({
          orgId: ORG_ID,
          engagementId: ENGAGEMENT_ID,
          componentId: COMPONENT_ID,
          reviewerUserId: REVIEWER_ID,
          status: 'COMPLETE',
          notes: 'Ready for approval',
          userId: USER_ID,
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true, reviewId: newReview.id });

    expect(upsertAuditModuleRecordMock).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        recordStatus: 'READY_FOR_REVIEW',
        currentStage: 'MANAGER',
        metadata: expect.objectContaining({ reviewStatus: 'COMPLETE' }),
      }),
    );

    expect(ensureAuditRecordApprovalStageMock).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        orgId: ORG_ID,
        engagementId: ENGAGEMENT_ID,
        moduleCode: 'GRP1',
        recordRef: COMPONENT_ID,
        stage: 'MANAGER',
        decision: 'PENDING',
        metadata: { reviewId: newReview.id },
        userId: USER_ID,
      }),
    );

    expect(logAuditActivityMock).toHaveBeenCalledWith(supabase, expect.objectContaining({
      action: 'GRP_REVIEW_UPDATED',
      metadata: expect.objectContaining({ status: 'COMPLETE' }),
    }));
  });

  it('returns 429 when rate limit exceeded', async () => {
    const { supabase } = createSupabase({ existingReview: null, rateAllowed: false });
    getServiceSupabaseClientMock.mockReturnValue(supabase);

    const response = await POST(
      new Request('https://example.com/api/group/review', {
        method: 'POST',
        body: JSON.stringify({
          orgId: ORG_ID,
          engagementId: ENGAGEMENT_ID,
          componentId: COMPONENT_ID,
          reviewerUserId: REVIEWER_ID,
          userId: USER_ID,
        }),
      }),
    );

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toEqual({ error: 'rate_limit_exceeded', retryAfterSeconds: 60 });
  });
});
