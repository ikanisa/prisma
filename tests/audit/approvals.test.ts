import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../apps/web/lib/audit/module-records', () => ({
  upsertAuditModuleRecord: vi.fn(),
  ensureAuditRecordApprovalStage: vi.fn(),
}));

import { queueManagerReview } from '../../apps/web/lib/audit/approvals';
import { ensureAuditRecordApprovalStage, upsertAuditModuleRecord } from '../../apps/web/lib/audit/module-records';

describe('queueManagerReview', () => {
  const client = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('promotes the module record to manager stage and queues approval', async () => {
    await queueManagerReview(client, {
      orgId: 'org-1',
      engagementId: 'eng-1',
      moduleCode: 'EXP1',
      recordRef: 'assessment-1',
      title: 'Specialist reliance conclusion',
      metadata: { conclusion: 'RELIED' },
      preparedByUserId: 'preparer-9',
      updatedByUserId: 'manager-3',
    });

    expect(upsertAuditModuleRecord).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        orgId: 'org-1',
        engagementId: 'eng-1',
        moduleCode: 'EXP1',
        recordRef: 'assessment-1',
        title: 'Specialist reliance conclusion',
        recordStatus: 'READY_FOR_REVIEW',
        approvalState: 'SUBMITTED',
        currentStage: 'MANAGER',
        metadata: { conclusion: 'RELIED' },
        preparedByUserId: 'preparer-9',
        updatedByUserId: 'manager-3',
      }),
    );

    expect(ensureAuditRecordApprovalStage).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        orgId: 'org-1',
        engagementId: 'eng-1',
        moduleCode: 'EXP1',
        recordRef: 'assessment-1',
        stage: 'MANAGER',
        decision: 'PENDING',
        metadata: { conclusion: 'RELIED' },
        userId: 'manager-3',
      }),
    );
  });
});
