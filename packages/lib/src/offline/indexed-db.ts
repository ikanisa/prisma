const isDomException = (error: unknown): error is DOMException =>
  typeof DOMException !== 'undefined' && error instanceof DOMException;

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

function ensureIndexedDb(): IDBFactory {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this environment.');
  }

  return indexedDB;
}

export function createIndexedDbStore<TValue>(config: IndexedDbStoreConfig): IndexedDbStore<TValue> {
  const { dbName, storeName, version = 1, onUpgrade } = config;
  let dbPromise: Promise<IDBDatabase> | null = null;

  const reset = () => {
    dbPromise = null;
  };

  const openDatabase = (): Promise<IDBDatabase> => {
    if (dbPromise) {
      return dbPromise;
    }

    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const request = ensureIndexedDb().open(dbName, version);

        request.onupgradeneeded = (event) => {
          const database = request.result;
          if (!database.objectStoreNames.contains(storeName)) {
            database.createObjectStore(storeName);
          }

          const transaction = request.transaction;
          if (!transaction) {
            return;
          }

          const store = transaction.objectStore(storeName);
          onUpgrade?.({
            database,
            transaction,
            store,
            oldVersion: event.oldVersion,
            newVersion: event.newVersion ?? null,
          });
        };

        request.onsuccess = () => {
          const database = request.result;
          database.onclose = reset;
          database.onversionchange = () => {
            database.close();
          };
          resolve(database);
        };

        request.onerror = () => {
          reset();
          reject(request.error ?? new Error('Failed to open IndexedDB.'));
        };

        request.onblocked = () => {
          reset();
        };
      } catch (error) {
        reset();
        reject(error);
      }
    });

    return dbPromise;
  };

  const withTransaction = async <TReturn>(
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => TReturn | Promise<TReturn>,
  ): Promise<TReturn> => {
    const database = await openDatabase();

    return new Promise<TReturn>((resolve, reject) => {
      let callbackResult: TReturn | Promise<TReturn>;

      try {
        const transaction = database.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);

        callbackResult = callback(store);

        transaction.oncomplete = async () => {
          try {
            resolve(await callbackResult);
          } catch (error) {
            reject(error);
          }
        };

        transaction.onerror = () => {
          reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
        };

        transaction.onabort = () => {
          reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
        };
      } catch (error) {
        reject(error);
      }
    });
  };

  const get = async (key: IDBValidKey): Promise<TValue | undefined> => {
    return withTransaction('readonly', (store) => {
      return new Promise<TValue | undefined>((resolve, reject) => {
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result as TValue | undefined);
        };

        request.onerror = () => {
          reject(request.error ?? new Error('Failed to read from IndexedDB.'));
        };
      });
    });
  };

  const set = async (key: IDBValidKey, value: TValue): Promise<void> => {
    return withTransaction('readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put(value, key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error ?? new Error('Failed to write to IndexedDB.'));
      });
    });
  };

  const remove = async (key: IDBValidKey): Promise<void> => {
    return withTransaction('readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error ?? new Error('Failed to delete from IndexedDB.'));
      });
    });
  };

  const getAll = async (): Promise<TValue[]> => {
    return withTransaction('readonly', (store) => {
      return new Promise<TValue[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve((request.result ?? []) as TValue[]);
        request.onerror = () => reject(request.error ?? new Error('Failed to get all values from IndexedDB.'));
      });
    });
  };

  const getAllKeys = async (): Promise<IDBValidKey[]> => {
    return withTransaction('readonly', (store) => {
      return new Promise<IDBValidKey[]>((resolve, reject) => {
        const request = store.getAllKeys();
        request.onsuccess = () => resolve((request.result ?? []) as IDBValidKey[]);
        request.onerror = () => reject(request.error ?? new Error('Failed to get keys from IndexedDB.'));
      });
    });
  };

  const clear = async (): Promise<void> => {
    return withTransaction('readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error ?? new Error('Failed to clear IndexedDB store.'));
      });
    });
  };

  return {
    async get(key) {
      try {
        return await get(key);
      } catch (error) {
        if (isDomException(error) && error.name === 'InvalidStateError') {
          reset();
        }

        throw error;
      }
    },
    async set(key, value) {
      try {
        await set(key, value);
      } catch (error) {
        if (isDomException(error) && error.name === 'InvalidStateError') {
          reset();
        }

        throw error;
      }
    },
    async delete(key) {
      try {
        await remove(key);
      } catch (error) {
        if (isDomException(error) && error.name === 'InvalidStateError') {
          reset();
        }

        throw error;
      }
    },
    async getAll() {
      try {
        return await getAll();
      } catch (error) {
        if (isDomException(error) && error.name === 'InvalidStateError') {
          reset();
        }

        throw error;
      }
    },
    async clear() {
      try {
        await clear();
      } catch (error) {
        if (isDomException(error) && error.name === 'InvalidStateError') {
          reset();
        }

        throw error;
      }
    },
    async getAllKeys() {
      try {
        return await getAllKeys();
      } catch (error) {
        if (isDomException(error) && error.name === 'InvalidStateError') {
          reset();
        }

        throw error;
      }
    },
    isAvailable() {
      try {
        ensureIndexedDb();
        return true;
      } catch {
        return false;
      }
    },
  };
}
