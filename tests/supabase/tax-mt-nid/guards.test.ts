import { describe, expect, it, vi } from 'vitest';

import { HttpError, requireRole, roleRank } from '../../../supabase/functions/tax-mt-nid/access.ts';
import { logActivity } from '../../../supabase/functions/tax-mt-nid/activity.ts';

describe('requireRole', () => {
  it('allows when current role meets minimum', () => {
    expect(() => requireRole('MANAGER', 'EMPLOYEE')).not.toThrow();
    expect(() => requireRole('SYSTEM_ADMIN', 'MANAGER')).not.toThrow();
  });

  it('rejects when role is insufficient', () => {
    expect(() => requireRole('EMPLOYEE', 'MANAGER')).toThrowError(HttpError);
    try {
      requireRole('EMPLOYEE', 'MANAGER');
    } catch (error) {
      const err = error as HttpError;
      expect(err.status).toBe(403);
      expect(err.message).toBe('insufficient_role');
    }
  });

  it('maintains deterministic role ranking', () => {
    expect(roleRank.EMPLOYEE).toBeLessThan(roleRank.MANAGER);
    expect(roleRank.MANAGER).toBeLessThan(roleRank.SYSTEM_ADMIN);
  });
});

describe('logActivity', () => {
  it('persists activity payload to Supabase', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ insert }));
    const client = { from } as const;

    await logActivity(client, {
      orgId: 'org-1',
      userId: 'user-1',
      action: 'MT_NID_COMPUTED',
      entityId: 'calc-1',
      metadata: { period: '2024', taxEntityId: 'tax-1' },
    });

    expect(from).toHaveBeenCalledWith('activity_log');
    expect(insert).toHaveBeenCalledWith({
      org_id: 'org-1',
      user_id: 'user-1',
      action: 'MT_NID_COMPUTED',
      entity_type: 'TAX_MT_CALC',
      entity_id: 'calc-1',
      metadata: { period: '2024', taxEntityId: 'tax-1' },
    });
  });

  it('logs to console when insert fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const insert = vi.fn().mockResolvedValue({ error: { message: 'boom' } });
    const from = vi.fn(() => ({ insert }));
    const client = { from } as const;

    await logActivity(client, {
      orgId: 'org-1',
      userId: 'user-2',
      action: 'MT_PATENT_BOX_COMPUTED',
      entityId: 'calc-2',
    });

    expect(consoleSpy).toHaveBeenCalledWith('activity_log_error', { message: 'boom' });
    consoleSpy.mockRestore();
  });
});
