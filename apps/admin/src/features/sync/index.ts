import type { MergeResult, SyncSnapshot } from '@prisma-glow/lib/offline/conflict-resolution.js';
import { deterministicMerge } from '@prisma-glow/lib/offline/conflict-resolution.js';
import type { DraftSnapshot } from '../../lib/offline/drafts.js';
import {
  adminDraftStorage,
  getAdminDraft,
  listAdminDrafts,
  markAdminDraftDirty,
  markAdminDraftSynced,
  removeAdminDraft,
  saveAdminDraft,
  writeAdminSnapshot,
  type AdminDraftPayload,
} from '../../lib/offline/drafts.js';

export interface AdminSyncResult extends MergeResult<AdminDraftPayload> {
  persisted: DraftSnapshot<AdminDraftPayload>;
}

export const toAdminSyncSnapshot = (
  snapshot: DraftSnapshot<AdminDraftPayload>,
): SyncSnapshot<AdminDraftPayload> => ({
  entityType: snapshot.entityType,
  entityId: snapshot.entityId,
  data: snapshot.data,
  metadata: snapshot.metadata,
});

export const queueAdminDraftUpdate = async (
  entityType: string,
  entityId: string,
  data: AdminDraftPayload,
  metadata?: Partial<SyncSnapshot<AdminDraftPayload>['metadata']>,
): Promise<DraftSnapshot<AdminDraftPayload>> =>
  saveAdminDraft({ entityType, entityId, data, metadata, dirty: true });

export const applyAdminRemoteSnapshot = async (
  snapshot: SyncSnapshot<AdminDraftPayload>,
): Promise<DraftSnapshot<AdminDraftPayload>> =>
  writeAdminSnapshot({
    entityType: snapshot.entityType,
    entityId: snapshot.entityId,
    data: snapshot.data,
    metadata: snapshot.metadata,
    dirty: false,
  });

export const reconcileAdminDraft = async (
  remote: SyncSnapshot<AdminDraftPayload>,
  base: SyncSnapshot<AdminDraftPayload> | null,
): Promise<AdminSyncResult> => {
  const localDraft = await getAdminDraft(remote.entityType, remote.entityId);

  if (!localDraft) {
    const persisted = await applyAdminRemoteSnapshot(remote);
    return {
      merged: remote,
      conflicts: [],
      winner: 'remote',
      persisted,
    };
  }

  const merge = deterministicMerge(base, toAdminSyncSnapshot(localDraft), remote);
  const shouldStayDirty = merge.winner === 'local' || (merge.winner === 'mixed' && localDraft.dirty);

  const persisted = await writeAdminSnapshot({
    entityType: remote.entityType,
    entityId: remote.entityId,
    data: merge.merged.data,
    metadata: merge.merged.metadata,
    dirty: shouldStayDirty,
  });

  return {
    ...merge,
    persisted,
  };
};

export const markAdminDraftAsSynced = (
  entityType: string,
  entityId: string,
  metadata?: Partial<SyncSnapshot<AdminDraftPayload>['metadata']>,
) => markAdminDraftSynced(entityType, entityId, metadata);

export const markAdminDraftAsDirty = (
  entityType: string,
  entityId: string,
  metadata?: Partial<SyncSnapshot<AdminDraftPayload>['metadata']>,
) => markAdminDraftDirty(entityType, entityId, metadata);

export const deleteAdminDraft = (entityType: string, entityId: string) =>
  removeAdminDraft(entityType, entityId);

export const listPendingAdminDrafts = () =>
  listAdminDrafts({ dirtyOnly: true });

export const clearAdminDraftCache = () => adminDraftStorage.clear();

export { getAdminDraft } from '../../lib/offline/drafts.js';
