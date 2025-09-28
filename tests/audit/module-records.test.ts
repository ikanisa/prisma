import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ensureAuditRecordApprovalStage, upsertAuditModuleRecord } from '../../apps/web/lib/audit/module-records';

type SupabaseStub = {
  from: ReturnType<typeof vi.fn>;
};

type ModuleMocks = {
  fetchMaybeSingle: ReturnType<typeof vi.fn>;
  matchMock: ReturnType<typeof vi.fn>;
  selectMock: ReturnType<typeof vi.fn>;
  insertMock: ReturnType<typeof vi.fn>;
  insertSelectMock: ReturnType<typeof vi.fn>;
  insertMaybeSingle: ReturnType<typeof vi.fn>;
  updateMock: ReturnType<typeof vi.fn>;
  updateEqMock: ReturnType<typeof vi.fn>;
  updateSelectMock: ReturnType<typeof vi.fn>;
  updateMaybeSingle: ReturnType<typeof vi.fn>;
};

type ApprovalMocks = {
  fetchMaybeSingle: ReturnType<typeof vi.fn>;
  matchMock: ReturnType<typeof vi.fn>;
  selectMock: ReturnType<typeof vi.fn>;
  updateMock: ReturnType<typeof vi.fn>;
  updateEqMock: ReturnType<typeof vi.fn>;
  insertMock: ReturnType<typeof vi.fn>;
  insertSelectMock: ReturnType<typeof vi.fn>;
  insertMaybeSingle: ReturnType<typeof vi.fn>;
};

function createSupabaseStub() {
  const moduleMocks: ModuleMocks = {
    fetchMaybeSingle: vi.fn(),
    matchMock: vi.fn(),
    selectMock: vi.fn(),
    insertMock: vi.fn(),
    insertSelectMock: vi.fn(),
    insertMaybeSingle: vi.fn(),
    updateMock: vi.fn(),
    updateEqMock: vi.fn(),
    updateSelectMock: vi.fn(),
    updateMaybeSingle: vi.fn(),
  };

  moduleMocks.matchMock.mockReturnValue({ maybeSingle: moduleMocks.fetchMaybeSingle });
  moduleMocks.selectMock.mockReturnValue({ match: moduleMocks.matchMock });

  moduleMocks.insertSelectMock.mockReturnValue({ maybeSingle: moduleMocks.insertMaybeSingle });
  moduleMocks.insertMock.mockReturnValue({ select: moduleMocks.insertSelectMock });

  moduleMocks.updateSelectMock.mockReturnValue({ maybeSingle: moduleMocks.updateMaybeSingle });
  moduleMocks.updateEqMock.mockReturnValue({ select: moduleMocks.updateSelectMock });
  moduleMocks.updateMock.mockReturnValue({ eq: moduleMocks.updateEqMock });

  const approvalMocks: ApprovalMocks = {
    fetchMaybeSingle: vi.fn(),
    matchMock: vi.fn(),
    selectMock: vi.fn(),
    updateMock: vi.fn(),
    updateEqMock: vi.fn(),
    insertMock: vi.fn(),
    insertSelectMock: vi.fn(),
    insertMaybeSingle: vi.fn(),
  };

  approvalMocks.matchMock.mockReturnValue({ maybeSingle: approvalMocks.fetchMaybeSingle });
  approvalMocks.selectMock.mockReturnValue({ match: approvalMocks.matchMock });

  approvalMocks.updateEqMock.mockResolvedValue({ error: null });
  approvalMocks.updateMock.mockReturnValue({ eq: approvalMocks.updateEqMock });

  approvalMocks.insertSelectMock.mockReturnValue({ maybeSingle: approvalMocks.insertMaybeSingle });
  approvalMocks.insertMock.mockReturnValue({ select: approvalMocks.insertSelectMock });

  const fromMock = vi.fn((table: string) => {
    if (table === 'audit_module_records') {
      return {
        select: moduleMocks.selectMock,
        insert: moduleMocks.insertMock,
        update: moduleMocks.updateMock,
      };
    }
    if (table === 'audit_record_approvals') {
      return {
        select: approvalMocks.selectMock,
        update: approvalMocks.updateMock,
        insert: approvalMocks.insertMock,
      };
    }
    throw new Error(`Unexpected table access: ${table}`);
  });

  const client = { from: fromMock } as unknown as SupabaseStub;

  return { client, moduleMocks, approvalMocks };
}

describe('upsertAuditModuleRecord', () => {
  let supabase: ReturnType<typeof createSupabaseStub>;

  beforeEach(() => {
    supabase = createSupabaseStub();
  });

  it('creates a new record when none exists', async () => {
    const { client, moduleMocks } = supabase;

    moduleMocks.fetchMaybeSingle.mockResolvedValue({ data: null, error: null });
    moduleMocks.insertMaybeSingle.mockResolvedValue({
      data: {
        id: 'record-1',
        title: 'Group component register',
      },
      error: null,
    });

    const result = await upsertAuditModuleRecord(client as any, {
      orgId: 'org-1',
      engagementId: 'eng-1',
      moduleCode: 'GRP1',
      recordRef: 'component-1',
      title: 'Group component register',
      recordStatus: 'IN_PROGRESS',
      approvalState: 'DRAFT',
      currentStage: 'PREPARER',
      preparedByUserId: 'user-1',
      metadata: { significance: 'SIGNIFICANT' },
      userId: 'user-1',
    });

    expect(result).toEqual({ id: 'record-1', title: 'Group component register' });

    expect(moduleMocks.insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: 'org-1',
        engagement_id: 'eng-1',
        module_code: 'GRP1',
        record_ref: 'component-1',
        title: 'Group component register',
        record_status: 'IN_PROGRESS',
        approval_state: 'DRAFT',
        current_stage: 'PREPARER',
        prepared_by_user_id: 'user-1',
        metadata: { significance: 'SIGNIFICANT' },
        created_by_user_id: 'user-1',
      }),
    );
  });

  it('updates an existing record merging metadata and preserving approvals', async () => {
    const { client, moduleMocks } = supabase;

    moduleMocks.fetchMaybeSingle.mockResolvedValue({
      data: {
        id: 'record-42',
        title: 'Component register',
        record_status: 'IN_PROGRESS',
        approval_state: 'DRAFT',
        current_stage: 'PREPARER',
        prepared_by_user_id: 'prep-1',
        owner_user_id: null,
        current_reviewer_user_id: null,
        locked_at: null,
        approvals: [{ stage: 'MANAGER', decision: 'PENDING' }],
        metadata: { significance: 'SIGNIFICANT', country: 'MT' },
        updated_by_user_id: 'prep-1',
      },
      error: null,
    });

    moduleMocks.updateMaybeSingle.mockResolvedValue({
      data: {
        id: 'record-42',
        title: 'Component register',
      },
      error: null,
    });

    const result = await upsertAuditModuleRecord(client as any, {
      orgId: 'org-1',
      engagementId: 'eng-1',
      moduleCode: 'GRP1',
      recordRef: 'component-1',
      recordStatus: 'READY_FOR_REVIEW',
      approvalState: 'SUBMITTED',
      currentStage: 'MANAGER',
      currentReviewerUserId: 'manager-7',
      metadata: { materiality: 125000 },
      updatedByUserId: 'manager-7',
    });

    expect(result).toEqual({ id: 'record-42', title: 'Component register' });

    expect(moduleMocks.updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Component register',
        record_status: 'READY_FOR_REVIEW',
        approval_state: 'SUBMITTED',
        current_stage: 'MANAGER',
        prepared_by_user_id: 'prep-1',
        current_reviewer_user_id: 'manager-7',
        approvals: [{ stage: 'MANAGER', decision: 'PENDING' }],
        metadata: {
          significance: 'SIGNIFICANT',
          country: 'MT',
          materiality: 125000,
        },
        updated_by_user_id: 'manager-7',
      }),
    );

    expect(moduleMocks.updateEqMock).toHaveBeenCalledWith('id', 'record-42');
  });
});

describe('ensureAuditRecordApprovalStage', () => {
  let supabase: ReturnType<typeof createSupabaseStub>;

  beforeEach(() => {
    supabase = createSupabaseStub();
    supabase.moduleMocks.fetchMaybeSingle.mockResolvedValue({
      data: {
        id: 'record-42',
        title: 'Component register',
      },
      error: null,
    });
  });

  it('inserts a new approval stage when missing', async () => {
    const { client, approvalMocks } = supabase;

    approvalMocks.fetchMaybeSingle.mockResolvedValue({ data: null, error: null });
    approvalMocks.insertMaybeSingle.mockResolvedValue({ data: { id: 'approval-1' }, error: null });

    const id = await ensureAuditRecordApprovalStage(client as any, {
      orgId: 'org-1',
      engagementId: 'eng-1',
      moduleCode: 'GRP1',
      recordRef: 'component-1',
      stage: 'MANAGER',
      decision: 'PENDING',
      metadata: { conclusion: 'RELIED' },
      userId: 'manager-1',
    });

    expect(id).toBe('approval-1');
    expect(approvalMocks.insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        record_id: 'record-42',
        stage: 'MANAGER',
        decision: 'PENDING',
        metadata: { conclusion: 'RELIED' },
        created_by_user_id: 'manager-1',
        updated_by_user_id: 'manager-1',
      }),
    );
  });

  it('updates an existing approval stage and merges metadata', async () => {
    const { client, approvalMocks } = supabase;

    approvalMocks.fetchMaybeSingle.mockResolvedValue({
      data: { id: 'approval-9', metadata: { prior: true } },
      error: null,
    });

    const id = await ensureAuditRecordApprovalStage(client as any, {
      orgId: 'org-1',
      engagementId: 'eng-1',
      moduleCode: 'GRP1',
      recordRef: 'component-1',
      stage: 'MANAGER',
      decision: 'APPROVED',
      decidedByUserId: 'partner-1',
      decidedAt: '2025-09-24T10:00:00Z',
      note: 'Sign-off after manager review',
      metadata: { updated: true },
      userId: 'partner-1',
    } as any);

    expect(id).toBe('approval-9');

    expect(approvalMocks.updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: 'APPROVED',
        decided_by_user_id: 'partner-1',
        decided_at: '2025-09-24T10:00:00Z',
        metadata: { prior: true, updated: true },
        updated_by_user_id: 'partner-1',
      }),
    );

    expect(approvalMocks.updateEqMock).toHaveBeenCalledWith('id', 'approval-9');
  });

  it('throws when the audit module record is missing', async () => {
    const { client, moduleMocks } = supabase;
    moduleMocks.fetchMaybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(
      ensureAuditRecordApprovalStage(client as any, {
        orgId: 'org-1',
        engagementId: 'eng-1',
        moduleCode: 'GRP1',
        recordRef: 'component-1',
        stage: 'MANAGER',
      }),
    ).rejects.toThrow('Audit module record not found for approval stage');
  });
});
