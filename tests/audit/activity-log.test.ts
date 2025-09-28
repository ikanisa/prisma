import { describe, expect, it, vi } from 'vitest';

import { logAuditActivity } from '../../apps/web/lib/audit/activity-log';

describe('logAuditActivity', () => {
  it('inserts an activity with default entity type', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const fromMock = vi.fn(() => ({ insert: insertMock }));
    const client = { from: fromMock } as any;

    await logAuditActivity(client, {
      orgId: 'org-1',
      userId: 'user-9',
      action: 'GRP_COMPONENT_CREATED',
      entityId: 'component-5',
      metadata: { significance: 'KEY' },
    });

    expect(fromMock).toHaveBeenCalledWith('activity_log');
    expect(insertMock).toHaveBeenCalledWith({
      org_id: 'org-1',
      user_id: 'user-9',
      action: 'GRP_COMPONENT_CREATED',
      entity_type: 'AUDIT_CONTROL',
      entity_id: 'component-5',
      metadata: { significance: 'KEY' },
    });
  });

  it('allows specifying an explicit entity type', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const fromMock = vi.fn(() => ({ insert: insertMock }));
    const client = { from: fromMock } as any;

    await logAuditActivity(client, {
      orgId: 'org-1',
      userId: 'user-9',
      action: 'GRP_REVIEW_UPDATED',
      entityType: 'AUDIT_GROUP',
      entityId: 'review-1',
      metadata: { status: 'COMPLETE' },
    });

    expect(insertMock).toHaveBeenLastCalledWith({
      org_id: 'org-1',
      user_id: 'user-9',
      action: 'GRP_REVIEW_UPDATED',
      entity_type: 'AUDIT_GROUP',
      entity_id: 'review-1',
      metadata: { status: 'COMPLETE' },
    });
  });
});
