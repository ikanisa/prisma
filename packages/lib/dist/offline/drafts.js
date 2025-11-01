import { createIndexedDbStore } from './indexed-db.js';
const composeStorageKey = (entityType, entityId) => `${entityType}::${entityId}`;
const sortByUpdatedAtDesc = (a, b) => b.metadata.updatedAt - a.metadata.updatedAt;
const buildMetadata = (existing, incoming, fallbackClientId) => ({
    clientId: incoming?.clientId ?? existing?.metadata.clientId ?? fallbackClientId,
    version: incoming?.version ?? existing?.metadata.version ?? 0,
    updatedAt: incoming?.updatedAt ?? Date.now(),
});
const toSnapshot = (record) => ({
    entityType: record.entityType,
    entityId: record.entityId,
    data: record.data,
    metadata: { ...record.metadata },
    dirty: record.dirty,
    storageKey: record.storageKey,
});
const sanitizeData = (value) => {
    try {
        return structuredClone(value);
    }
    catch {
        return JSON.parse(JSON.stringify(value));
    }
};
export function createDraftStorage(config) {
    const store = createIndexedDbStore({
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
    const ensureRecord = async (input, options) => {
        const storageKey = composeStorageKey(input.entityType, input.entityId);
        const existing = await store.get(storageKey);
        const metadata = buildMetadata(existing, input.metadata, config.clientId ?? 'local-client');
        const dirty = options?.forceDirty ?? input.dirty ?? existing?.dirty ?? false;
        const record = {
            entityType: input.entityType,
            entityId: input.entityId,
            data: sanitizeData(input.data),
            metadata,
            dirty,
            storageKey,
        };
        return record;
    };
    const persistRecord = async (record) => {
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
