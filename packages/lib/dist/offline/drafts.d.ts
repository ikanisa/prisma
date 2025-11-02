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
    listSnapshots(options?: {
        entityType?: string;
        dirtyOnly?: boolean;
    }): Promise<DraftSnapshot<TValue>[]>;
    removeSnapshot(entityType: string, entityId: string): Promise<void>;
    markClean(entityType: string, entityId: string, metadata?: Partial<DraftMetadata>): Promise<DraftSnapshot<TValue> | undefined>;
    markDirty(entityType: string, entityId: string, metadata?: Partial<DraftMetadata>): Promise<DraftSnapshot<TValue> | undefined>;
    purge(predicate: (snapshot: DraftSnapshot<TValue>) => boolean | Promise<boolean>): Promise<void>;
    clear(): Promise<void>;
    isAvailable(): boolean;
}
export declare function createDraftStorage<TValue extends Record<string, unknown>>(config: DraftStorageConfig): DraftStorage<TValue>;
//# sourceMappingURL=drafts.d.ts.map