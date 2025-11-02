const isDomException = (error) => typeof DOMException !== 'undefined' && error instanceof DOMException;
function ensureIndexedDb() {
    if (typeof indexedDB === 'undefined') {
        throw new Error('IndexedDB is not available in this environment.');
    }
    return indexedDB;
}
export function createIndexedDbStore(config) {
    const { dbName, storeName, version = 1, onUpgrade } = config;
    let dbPromise = null;
    const reset = () => {
        dbPromise = null;
    };
    const openDatabase = () => {
        if (dbPromise) {
            return dbPromise;
        }
        dbPromise = new Promise((resolve, reject) => {
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
            }
            catch (error) {
                reset();
                reject(error);
            }
        });
        return dbPromise;
    };
    const withTransaction = async (mode, callback) => {
        const database = await openDatabase();
        return new Promise((resolve, reject) => {
            let callbackResult;
            try {
                const transaction = database.transaction(storeName, mode);
                const store = transaction.objectStore(storeName);
                callbackResult = callback(store);
                transaction.oncomplete = async () => {
                    try {
                        resolve(await callbackResult);
                    }
                    catch (error) {
                        reject(error);
                    }
                };
                transaction.onerror = () => {
                    reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
                };
                transaction.onabort = () => {
                    reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
                };
            }
            catch (error) {
                reject(error);
            }
        });
    };
    const get = async (key) => {
        return withTransaction('readonly', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.get(key);
                request.onsuccess = () => {
                    resolve(request.result);
                };
                request.onerror = () => {
                    reject(request.error ?? new Error('Failed to read from IndexedDB.'));
                };
            });
        });
    };
    const set = async (key, value) => {
        return withTransaction('readwrite', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.put(value, key);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error ?? new Error('Failed to write to IndexedDB.'));
            });
        });
    };
    const remove = async (key) => {
        return withTransaction('readwrite', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.delete(key);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error ?? new Error('Failed to delete from IndexedDB.'));
            });
        });
    };
    const getAll = async () => {
        return withTransaction('readonly', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve((request.result ?? []));
                request.onerror = () => reject(request.error ?? new Error('Failed to get all values from IndexedDB.'));
            });
        });
    };
    const getAllKeys = async () => {
        return withTransaction('readonly', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.getAllKeys();
                request.onsuccess = () => resolve((request.result ?? []));
                request.onerror = () => reject(request.error ?? new Error('Failed to get keys from IndexedDB.'));
            });
        });
    };
    const clear = async () => {
        return withTransaction('readwrite', (store) => {
            return new Promise((resolve, reject) => {
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
            }
            catch (error) {
                if (isDomException(error) && error.name === 'InvalidStateError') {
                    reset();
                }
                throw error;
            }
        },
        async set(key, value) {
            try {
                await set(key, value);
            }
            catch (error) {
                if (isDomException(error) && error.name === 'InvalidStateError') {
                    reset();
                }
                throw error;
            }
        },
        async delete(key) {
            try {
                await remove(key);
            }
            catch (error) {
                if (isDomException(error) && error.name === 'InvalidStateError') {
                    reset();
                }
                throw error;
            }
        },
        async getAll() {
            try {
                return await getAll();
            }
            catch (error) {
                if (isDomException(error) && error.name === 'InvalidStateError') {
                    reset();
                }
                throw error;
            }
        },
        async clear() {
            try {
                await clear();
            }
            catch (error) {
                if (isDomException(error) && error.name === 'InvalidStateError') {
                    reset();
                }
                throw error;
            }
        },
        async getAllKeys() {
            try {
                return await getAllKeys();
            }
            catch (error) {
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
            }
            catch {
                return false;
            }
        },
    };
}
