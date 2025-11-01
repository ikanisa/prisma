import { expect, test } from '@playwright/test';
import 'fake-indexeddb/auto';
import type { SyncSnapshot } from '@prisma-glow/lib/offline/conflict-resolution.js';
import {
  applyAdminRemoteSnapshot,
  clearAdminDraftCache,
  getAdminDraft,
  listPendingAdminDrafts,
  queueAdminDraftUpdate,
  reconcileAdminDraft,
  toAdminSyncSnapshot,
  type AdminDraftPayload,
} from '../../src/features/sync/index.js';

const entityType = 'control';
const entityId = 'admin-1';

test.describe('admin offline drafts', () => {
  test.beforeEach(async () => {
    await clearAdminDraftCache();
  });

  test('persists drafts locally when offline', async () => {
    await queueAdminDraftUpdate(
      entityType,
      entityId,
      { name: 'Control activity', description: 'Review approvals weekly' },
      { clientId: 'admin', updatedAt: Date.now(), version: 1 },
    );

    const snapshot = await getAdminDraft(entityType, entityId);
    expect(snapshot?.data.name).toBe('Control activity');

    const pending = await listPendingAdminDrafts();
    expect(pending.length).toBe(1);
    expect(pending[0].dirty).toBeTruthy();
  });

  test('merges remote updates deterministically', async () => {
    const base: SyncSnapshot<AdminDraftPayload> = {
      entityType,
      entityId,
      data: { name: 'Control activity', description: 'Weekly review', owner: 'sam' },
      metadata: { clientId: 'server', updatedAt: 500, version: 1 },
    };

    await applyAdminRemoteSnapshot(base);

    await queueAdminDraftUpdate(
      entityType,
      entityId,
      { name: 'Control activity - local', description: 'Weekly review + automation', owner: 'sam' },
      { clientId: 'admin-local', updatedAt: 1_500, version: 2 },
    );

    const remote: SyncSnapshot<AdminDraftPayload> = {
      entityType,
      entityId,
      data: { name: 'Control activity (updated)', description: 'Weekly review', owner: 'alex' },
      metadata: { clientId: 'server', updatedAt: 2_000, version: 3 },
    };

    const result = await reconcileAdminDraft(remote, base);

    expect(result.winner).toBe('mixed');
    expect(result.merged.data).toEqual({
      name: 'Control activity (updated)',
      description: 'Weekly review + automation',
      owner: 'alex',
    });
    expect(result.conflicts.map((conflict) => conflict.field)).toContain('name');

    const stored = await getAdminDraft(entityType, entityId);
    expect(stored?.data).toEqual(result.merged.data);
    expect(stored?.dirty).toBeTruthy();

    const syncSnapshot = toAdminSyncSnapshot(stored!);
    expect(syncSnapshot.metadata.updatedAt).toBe(result.merged.metadata.updatedAt);
  });
});
