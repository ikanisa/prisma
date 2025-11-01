import type { MergeResult, SyncSnapshot } from '@prisma-glow/lib/offline/conflict-resolution.js';
import { deterministicMerge } from '@prisma-glow/lib/offline/conflict-resolution.js';
import type { DraftSnapshot } from '../../lib/offline/drafts.js';
import {
  getStaffDraft,
  listStaffDrafts,
  markStaffDraftDirty,
  markStaffDraftSynced,
  removeStaffDraft,
  saveStaffDraft,
  staffDraftStorage,
  writeStaffSnapshot,
  type StaffDraftPayload,
} from '../../lib/offline/drafts.js';

export interface StaffSyncResult extends MergeResult<StaffDraftPayload> {
  persisted: DraftSnapshot<StaffDraftPayload>;
}

export const toSyncSnapshot = (
  snapshot: DraftSnapshot<StaffDraftPayload>,
): SyncSnapshot<StaffDraftPayload> => ({
  entityType: snapshot.entityType,
  entityId: snapshot.entityId,
  data: snapshot.data,
  metadata: snapshot.metadata,
});

export const queueStaffDraftUpdate = async (
  entityType: string,
  entityId: string,
  data: StaffDraftPayload,
  metadata?: Partial<SyncSnapshot<StaffDraftPayload>['metadata']>,
): Promise<DraftSnapshot<StaffDraftPayload>> =>
  saveStaffDraft({ entityType, entityId, data, metadata, dirty: true });

export const applyStaffRemoteSnapshot = async (
  snapshot: SyncSnapshot<StaffDraftPayload>,
): Promise<DraftSnapshot<StaffDraftPayload>> =>
  writeStaffSnapshot({
    entityType: snapshot.entityType,
    entityId: snapshot.entityId,
    data: snapshot.data,
    metadata: snapshot.metadata,
    dirty: false,
  });

export const reconcileStaffDraft = async (
  remote: SyncSnapshot<StaffDraftPayload>,
  base: SyncSnapshot<StaffDraftPayload> | null,
): Promise<StaffSyncResult> => {
  const localDraft = await getStaffDraft(remote.entityType, remote.entityId);

  if (!localDraft) {
    const persisted = await applyStaffRemoteSnapshot(remote);
    return {
      merged: remote,
      conflicts: [],
      winner: 'remote',
      persisted,
    };
  }

  const merge = deterministicMerge(base, toSyncSnapshot(localDraft), remote);
  const shouldStayDirty = merge.winner === 'local' || (merge.winner === 'mixed' && localDraft.dirty);

  const persisted = await writeStaffSnapshot({
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

export const markStaffDraftAsSynced = (
  entityType: string,
  entityId: string,
  metadata?: Partial<SyncSnapshot<StaffDraftPayload>['metadata']>,
) => markStaffDraftSynced(entityType, entityId, metadata);

export const markStaffDraftAsDirty = (
  entityType: string,
  entityId: string,
  metadata?: Partial<SyncSnapshot<StaffDraftPayload>['metadata']>,
) => markStaffDraftDirty(entityType, entityId, metadata);

export const deleteStaffDraft = (entityType: string, entityId: string) =>
  removeStaffDraft(entityType, entityId);

export const listPendingStaffDrafts = () =>
  listStaffDrafts({ dirtyOnly: true });

export const clearStaffDraftCache = () => staffDraftStorage.clear();

export { getStaffDraft } from '../../lib/offline/drafts.js';
