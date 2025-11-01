import type {
  DraftMetadata,
  DraftSnapshot,
  DraftSnapshotInput,
  DraftStorage,
} from '@prisma-glow/lib/offline/drafts.js';
import { createDraftStorage } from '@prisma-glow/lib/offline/drafts.js';

export type AdminDraftPayload = Record<string, unknown>;

const ADMIN_DRAFT_DB = {
  dbName: 'prisma-admin-offline',
  storeName: 'admin-drafts',
  clientId: 'admin-app',
};

export const adminDraftStorage: DraftStorage<AdminDraftPayload> = createDraftStorage<AdminDraftPayload>(
  ADMIN_DRAFT_DB,
);

export const saveAdminDraft = (
  input: DraftSnapshotInput<AdminDraftPayload>,
): Promise<DraftSnapshot<AdminDraftPayload>> =>
  adminDraftStorage.saveDraft(input);

export const writeAdminSnapshot = (
  input: DraftSnapshotInput<AdminDraftPayload>,
): Promise<DraftSnapshot<AdminDraftPayload>> => adminDraftStorage.writeSnapshot(input);

export const getAdminDraft = (
  entityType: string,
  entityId: string,
): Promise<DraftSnapshot<AdminDraftPayload> | undefined> =>
  adminDraftStorage.getSnapshot(entityType, entityId);

export const listAdminDrafts = (
  options?: { entityType?: string; dirtyOnly?: boolean },
): Promise<DraftSnapshot<AdminDraftPayload>[]> => adminDraftStorage.listSnapshots(options);

export const markAdminDraftSynced = (
  entityType: string,
  entityId: string,
  metadata?: Partial<DraftMetadata>,
): Promise<DraftSnapshot<AdminDraftPayload> | undefined> =>
  adminDraftStorage.markClean(entityType, entityId, metadata);

export const markAdminDraftDirty = (
  entityType: string,
  entityId: string,
  metadata?: Partial<DraftMetadata>,
): Promise<DraftSnapshot<AdminDraftPayload> | undefined> =>
  adminDraftStorage.markDirty(entityType, entityId, metadata);

export const removeAdminDraft = (
  entityType: string,
  entityId: string,
): Promise<void> => adminDraftStorage.removeSnapshot(entityType, entityId);

export const clearAdminDrafts = (): Promise<void> => adminDraftStorage.clear();

export const purgeStaleAdminDrafts = async (staleAfterMs: number): Promise<void> => {
  const cutoff = Date.now() - staleAfterMs;
  await adminDraftStorage.purge((snapshot) => snapshot.metadata.updatedAt < cutoff && !snapshot.dirty);
};

export const isAdminOfflineSupported = (): boolean => adminDraftStorage.isAvailable();
