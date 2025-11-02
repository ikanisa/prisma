import { expect, test } from '@playwright/test';
import 'fake-indexeddb/auto';
import type { SyncSnapshot } from '@prisma-glow/lib/offline/conflict-resolution.js';
import {
  clearStaffDraftCache,
  getStaffDraft,
  listPendingStaffDrafts,
  queueStaffDraftUpdate,
  toSyncSnapshot,
  type StaffDraftPayload,
} from '../../src/features/sync/index.js';
import { applyStaffRemoteSnapshot, reconcileStaffDraft } from '../../src/features/sync/index.js';

const entityType = 'engagement';
const entityId = 'draft-1';

test.describe('staff offline drafts', () => {
  test.beforeEach(async () => {
    await clearStaffDraftCache();
  });

  test('stores local drafts offline and lists them for sync', async () => {
    const metadata = { clientId: 'playwright', updatedAt: Date.now(), version: 1 };
    await queueStaffDraftUpdate(entityType, entityId, { notes: 'Workpaper outline' }, metadata);

    const stored = await getStaffDraft(entityType, entityId);
    expect(stored?.data).toEqual({ notes: 'Workpaper outline' });
    expect(stored?.dirty).toBeTruthy();

    const pending = await listPendingStaffDrafts();
    expect(pending).toHaveLength(1);
    expect(pending[0].entityId).toBe(entityId);
  });

  test('performs deterministic conflict resolution during sync', async () => {
    const base: SyncSnapshot<StaffDraftPayload> = {
      entityType,
      entityId,
      data: { status: 'draft', owner: 'alice' },
      metadata: { clientId: 'server', updatedAt: 1_000, version: 1 },
    };

    await applyStaffRemoteSnapshot(base);
    await queueStaffDraftUpdate(
      entityType,
      entityId,
      { status: 'in-review', owner: 'carol' },
      { clientId: 'local-client', updatedAt: 2_000, version: 2 },
    );

    const remote: SyncSnapshot<StaffDraftPayload> = {
      entityType,
      entityId,
      data: { status: 'draft', owner: 'bob' },
      metadata: { clientId: 'remote', updatedAt: 2_100, version: 3 },
    };

    const result = await reconcileStaffDraft(remote, base);

    expect(result.winner).toBe('mixed');
    expect(result.merged.data).toEqual({ status: 'in-review', owner: 'bob' });
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].field).toBe('owner');

    const persisted = await getStaffDraft(entityType, entityId);
    expect(persisted?.data).toEqual(result.merged.data);
    expect(persisted?.dirty).toBeTruthy();

    const syncSnapshot = toSyncSnapshot(persisted!);
    expect(syncSnapshot.metadata.version).toBe(result.merged.metadata.version);
  });
});
