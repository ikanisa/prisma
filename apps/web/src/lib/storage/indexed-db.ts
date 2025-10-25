const DB_NAME = 'prisma-web-offline';
const STORE_NAME = 'keyval';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export interface IndexedDbConfig {
  name: string;
  storeName: string;
  version: number;
}

export const OFFLINE_INDEXED_DB_CONFIG: IndexedDbConfig = {
  name: DB_NAME,
  storeName: STORE_NAME,
  version: DB_VERSION,
};

const isDomException = (error: unknown): error is DOMException =>
  typeof DOMException !== 'undefined' && error instanceof DOMException;

export function isQuotaExceededError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  if (isDomException(error)) {
    return (
      error.name === 'QuotaExceededError' ||
      error.code === 22 ||
      error.code === 1014 ||
      // Firefox uses NS_ERROR_DOM_QUOTA_REACHED when storage quota is hit.
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
  }

  if (typeof error === 'object' && 'name' in (error as Record<string, unknown>)) {
    const { name } = error as { name?: unknown };
    return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
  }

  return false;
}

function resetDatabasePromise() {
  dbPromise = null;
}

function ensureIndexedDb(): IDBFactory {
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('IndexedDB is not available in this environment.');
  }

  return window.indexedDB;
}

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = ensureIndexedDb().open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        const database = request.result;
        database.onclose = resetDatabasePromise;
        database.onversionchange = () => {
          database.close();
        };
        resolve(database);
      };

      request.onerror = () => {
        resetDatabasePromise();
        reject(request.error ?? new Error('Failed to open IndexedDB.'));
      };

      request.onblocked = () => {
        resetDatabasePromise();
      };
    } catch (error) {
      resetDatabasePromise();
      reject(error);
    }
  });

  return dbPromise;
}

function createTransaction(mode: IDBTransactionMode): Promise<IDBTransaction> {
  return openDatabase().then((database) => database.transaction(STORE_NAME, mode));
}

export async function getFromIndexedDb<T>(key: string): Promise<T | undefined> {
  const transaction = await createTransaction('readonly');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise<T | undefined>((resolve, reject) => {
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result as T | undefined);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('Failed to read from IndexedDB.'));
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('IndexedDB read transaction failed.'));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error('IndexedDB read transaction aborted.'));
    };
  });
}

export async function setInIndexedDb<T>(key: string, value: T): Promise<void> {
  const transaction = await createTransaction('readwrite');
  const store = transaction.objectStore(STORE_NAME);

  await new Promise<void>((resolve, reject) => {
    const request = store.put(value, key);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error ?? new Error('Failed to write to IndexedDB.'));
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('IndexedDB write transaction failed.'));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error('IndexedDB write transaction aborted.'));
    };
  });
}

export async function deleteFromIndexedDb(key: string): Promise<void> {
  const transaction = await createTransaction('readwrite');
  const store = transaction.objectStore(STORE_NAME);

  await new Promise<void>((resolve, reject) => {
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to delete from IndexedDB.'));
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('IndexedDB delete transaction failed.'));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error('IndexedDB delete transaction aborted.'));
    };
  });
}

export async function clearIndexedDb(): Promise<void> {
  const transaction = await createTransaction('readwrite');
  const store = transaction.objectStore(STORE_NAME);

  await new Promise<void>((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to clear IndexedDB.'));
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('IndexedDB clear transaction failed.'));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error('IndexedDB clear transaction aborted.'));
    };
  });
}

export async function deleteIndexedDb(): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const deleteRequest = window.indexedDB.deleteDatabase(DB_NAME);
    deleteRequest.onsuccess = () => {
      resetDatabasePromise();
      resolve();
    };
    deleteRequest.onerror = () => {
      resetDatabasePromise();
      reject(deleteRequest.error ?? new Error('Failed to delete IndexedDB database.'));
    };
    deleteRequest.onblocked = () => {
      resetDatabasePromise();
    };
  });
}

export function isIndexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}
