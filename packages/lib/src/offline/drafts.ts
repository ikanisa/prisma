import { createIndexedDbStore, type IndexedDbStore } from './indexed-db.js';

export interface DraftMetadata {
  clientId: string;
  version: number;
  updatedAt: number;
}

export interface DraftSnapshot<TValue extends Record<string, unknown>> {
  entityType: string;
  entityId: string;
  data: TValue;
  metadata: DraftMetadata;
  dirty: boolean;
  storageKey: string;
}

export interface DraftSnapshotInput<TValue extends Record<string, unknown>> {
  entityType: string;
  entityId: string;
  data: TValue;
  metadata?: Partial<DraftMetadata>;
  dirty?: boolean;
}

export interface DraftStorageConfig {
  dbName: string;
  storeName: string;
  version?: number;
  clientId?: string;
}

export interface DraftStorage<TValue extends Record<string, unknown>> {
  saveDraft(input: DraftSnapshotInput<TValue>): Promise<DraftSnapshot<TValue>>;
  writeSnapshot(input: DraftSnapshotInput<TValue>): Promise<DraftSnapshot<TValue>>;
  getSnapshot(entityType: string, entityId: string): Promise<DraftSnapshot<TValue> | undefined>;
  listSnapshots(options?: { entityType?: string; dirtyOnly?: boolean }): Promise<DraftSnapshot<TValue>[]>;
  removeSnapshot(entityType: string, entityId: string): Promise<void>;
  markClean(entityType: string, entityId: string, metadata?: Partial<DraftMetadata>): Promise<DraftSnapshot<TValue> | undefined>;
  markDirty(entityType: string, entityId: string, metadata?: Partial<DraftMetadata>): Promise<DraftSnapshot<TValue> | undefined>;
  purge(predicate: (snapshot: DraftSnapshot<TValue>) => boolean | Promise<boolean>): Promise<void>;
  clear(): Promise<void>;
  isAvailable(): boolean;
}

interface DraftRecord<TValue extends Record<string, unknown>> extends DraftSnapshot<TValue> {}

const composeStorageKey = (entityType: string, entityId: string): string => `${entityType}::${entityId}`;

const sortByUpdatedAtDesc = <TValue extends Record<string, unknown>>(
  a: DraftSnapshot<TValue>,
  b: DraftSnapshot<TValue>,
) => b.metadata.updatedAt - a.metadata.updatedAt;

const buildMetadata = <TValue extends Record<string, unknown>>(
  existing: DraftRecord<TValue> | undefined,
  incoming: Partial<DraftMetadata> | undefined,
  fallbackClientId: string,
): DraftMetadata => ({
  clientId: incoming?.clientId ?? existing?.metadata.clientId ?? fallbackClientId,
  version: incoming?.version ?? existing?.metadata.version ?? 0,
  updatedAt: incoming?.updatedAt ?? Date.now(),
});

const toSnapshot = <TValue extends Record<string, unknown>>(
  record: DraftRecord<TValue>,
): DraftSnapshot<TValue> => ({
  entityType: record.entityType,
  entityId: record.entityId,
  data: record.data,
  metadata: { ...record.metadata },
  dirty: record.dirty,
  storageKey: record.storageKey,
});

const sanitizeData = <TValue extends Record<string, unknown>>(value: TValue): TValue => {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value)) as TValue;
  }
};

export function createDraftStorage<TValue extends Record<string, unknown>>(
  config: DraftStorageConfig,
): DraftStorage<TValue> {
  const store: IndexedDbStore<DraftRecord<TValue>> = createIndexedDbStore({
    dbName: config.dbName,
    storeName: config.storeName,
    version: config.version ?? 1,
    onUpgrade({ store }) {
      if (!store.indexNames.contains('entityType')) {
        store.createIndex('entityType', 'entityType', { unique: false });
      }
      if (!store.indexNames.contains('dirty')) {
        store.createIndex('dirty', 'dirty', { unique: false });
      }
    },
  });

  const ensureRecord = async (
    input: DraftSnapshotInput<TValue>,
    options?: { forceDirty?: boolean },
  ): Promise<DraftRecord<TValue>> => {
    const storageKey = composeStorageKey(input.entityType, input.entityId);
    const existing = await store.get(storageKey);
    const metadata = buildMetadata(existing, input.metadata, config.clientId ?? 'local-client');

    const dirty = options?.forceDirty ?? input.dirty ?? existing?.dirty ?? false;

    const record: DraftRecord<TValue> = {
      entityType: input.entityType,
      entityId: input.entityId,
      data: sanitizeData(input.data),
      metadata,
      dirty,
      storageKey,
    };

    return record;
  };

  const persistRecord = async (record: DraftRecord<TValue>): Promise<DraftSnapshot<TValue>> => {
    await store.set(record.storageKey, record);
    return toSnapshot(record);
  };

  return {
    async saveDraft(input) {
      const record = await ensureRecord(input, { forceDirty: true });
      return persistRecord(record);
    },
    async writeSnapshot(input) {
      const record = await ensureRecord(input);
      return persistRecord(record);
    },
    async getSnapshot(entityType, entityId) {
      const storageKey = composeStorageKey(entityType, entityId);
      const record = await store.get(storageKey);
      return record ? toSnapshot(record) : undefined;
    },
    async listSnapshots(options) {
      const records = await store.getAll();
      const filtered = records.filter((record) => {
        if (options?.entityType && record.entityType !== options.entityType) {
          return false;
        }
        if (options?.dirtyOnly && !record.dirty) {
          return false;
        }
        return true;
      });

      return filtered.map(toSnapshot).sort(sortByUpdatedAtDesc);
    },
    async removeSnapshot(entityType, entityId) {
      const storageKey = composeStorageKey(entityType, entityId);
      await store.delete(storageKey);
    },
    async markClean(entityType, entityId, metadata) {
      const snapshot = await this.getSnapshot(entityType, entityId);
      if (!snapshot) {
        return undefined;
      }

      return this.writeSnapshot({
        entityType,
        entityId,
        data: snapshot.data,
        metadata: {
          ...snapshot.metadata,
          ...metadata,
          updatedAt: metadata?.updatedAt ?? Date.now(),
        },
        dirty: false,
      });
    },
    async markDirty(entityType, entityId, metadata) {
      const snapshot = await this.getSnapshot(entityType, entityId);
      if (!snapshot) {
        return undefined;
      }

      return this.writeSnapshot({
        entityType,
        entityId,
        data: snapshot.data,
        metadata: {
          ...snapshot.metadata,
          ...metadata,
          updatedAt: metadata?.updatedAt ?? Date.now(),
        },
        dirty: true,
      });
    },
    async purge(predicate) {
      const records = await store.getAll();
      for (const record of records) {
        if (await predicate(toSnapshot(record))) {
          await store.delete(record.storageKey);
        }
      }
    },
    async clear() {
      await store.clear();
    },
    isAvailable() {
      return store.isAvailable();
    },
  };
}
