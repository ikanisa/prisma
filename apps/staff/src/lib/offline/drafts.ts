import type {
  DraftMetadata,
  DraftSnapshot,
  DraftSnapshotInput,
  DraftStorage,
} from '@prisma-glow/lib/offline/drafts.js';
import { createDraftStorage } from '@prisma-glow/lib/offline/drafts.js';

export type StaffDraftPayload = Record<string, unknown>;

const STAFF_DRAFT_DB = {
  dbName: 'prisma-staff-offline',
  storeName: 'staff-drafts',
  clientId: 'staff-app',
};

export const staffDraftStorage: DraftStorage<StaffDraftPayload> = createDraftStorage<StaffDraftPayload>(
  STAFF_DRAFT_DB,
);

export const saveStaffDraft = (
  input: DraftSnapshotInput<StaffDraftPayload>,
): Promise<DraftSnapshot<StaffDraftPayload>> =>
  staffDraftStorage.saveDraft(input);

export const writeStaffSnapshot = (
  input: DraftSnapshotInput<StaffDraftPayload>,
): Promise<DraftSnapshot<StaffDraftPayload>> => staffDraftStorage.writeSnapshot(input);

export const getStaffDraft = (
  entityType: string,
  entityId: string,
): Promise<DraftSnapshot<StaffDraftPayload> | undefined> =>
  staffDraftStorage.getSnapshot(entityType, entityId);

export const listStaffDrafts = (
  options?: { entityType?: string; dirtyOnly?: boolean },
): Promise<DraftSnapshot<StaffDraftPayload>[]> => staffDraftStorage.listSnapshots(options);

export const markStaffDraftSynced = (
  entityType: string,
  entityId: string,
  metadata?: Partial<DraftMetadata>,
): Promise<DraftSnapshot<StaffDraftPayload> | undefined> =>
  staffDraftStorage.markClean(entityType, entityId, metadata);

export const markStaffDraftDirty = (
  entityType: string,
  entityId: string,
  metadata?: Partial<DraftMetadata>,
): Promise<DraftSnapshot<StaffDraftPayload> | undefined> =>
  staffDraftStorage.markDirty(entityType, entityId, metadata);

export const removeStaffDraft = (
  entityType: string,
  entityId: string,
): Promise<void> => staffDraftStorage.removeSnapshot(entityType, entityId);

export const clearStaffDrafts = (): Promise<void> => staffDraftStorage.clear();

export const purgeStaleStaffDrafts = async (staleAfterMs: number): Promise<void> => {
  const cutoff = Date.now() - staleAfterMs;
  await staffDraftStorage.purge((snapshot) => snapshot.metadata.updatedAt < cutoff && !snapshot.dirty);
};

export const isStaffOfflineSupported = (): boolean => staffDraftStorage.isAvailable();
