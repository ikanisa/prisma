export interface IndexedDbUpgradeContext {
    database: IDBDatabase;
    transaction: IDBTransaction;
    store: IDBObjectStore;
    oldVersion: number;
    newVersion: number | null;
}
export interface IndexedDbStoreConfig {
    dbName: string;
    storeName: string;
    version?: number;
    onUpgrade?: (context: IndexedDbUpgradeContext) => void;
}
export interface IndexedDbStore<TValue> {
    get(key: IDBValidKey): Promise<TValue | undefined>;
    set(key: IDBValidKey, value: TValue): Promise<void>;
    delete(key: IDBValidKey): Promise<void>;
    getAll(): Promise<TValue[]>;
    clear(): Promise<void>;
    getAllKeys(): Promise<IDBValidKey[]>;
    isAvailable(): boolean;
}
export declare function createIndexedDbStore<TValue>(config: IndexedDbStoreConfig): IndexedDbStore<TValue>;
//# sourceMappingURL=indexed-db.d.ts.map