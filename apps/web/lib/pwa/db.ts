/**
 * IndexedDB schema and utilities for offline data storage
 * Provides structured offline storage for PWA functionality
 */

import { openDB, type IDBPDatabase } from 'idb';

export interface OfflineDocument {
  id: string;
  title: string;
  content: string;
  type: string;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
  serverId?: string;
}

export interface OfflineAction {
  id: string;
  action: string;
  endpoint: string;
  method: string;
  payload: unknown;
  headers?: Record<string, string>;
  timestamp: number;
  retries: number;
  lastError?: string;
  nextAttemptAt?: number;
}

export interface OfflineCache {
  key: string;
  url: string;
  data: unknown;
  timestamp: number;
  expiresAt: number;
}

interface PrismaGlowDB {
  documents: {
    key: string;
    value: OfflineDocument;
    indexes: {
      'by-synced': boolean;
      'by-updated': number;
    };
  };
  actions: {
    key: string;
    value: OfflineAction;
    indexes: {
      'by-timestamp': number;
      'by-retries': number;
    };
  };
  cache: {
    key: string;
    value: OfflineCache;
    indexes: {
      'by-expires': number;
    };
  };
}

const DB_NAME = 'prisma-glow-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<PrismaGlowDB> | null = null;

/**
 * Initialize IndexedDB database
 */
export async function initDB(): Promise<IDBPDatabase<PrismaGlowDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<PrismaGlowDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Documents store
      if (!db.objectStoreNames.contains('documents')) {
        const documentsStore = db.createObjectStore('documents', {
          keyPath: 'id',
        });
        documentsStore.createIndex('by-synced', 'synced');
        documentsStore.createIndex('by-updated', 'updatedAt');
      }

      // Actions queue store
      if (!db.objectStoreNames.contains('actions')) {
        const actionsStore = db.createObjectStore('actions', {
          keyPath: 'id',
        });
        actionsStore.createIndex('by-timestamp', 'timestamp');
        actionsStore.createIndex('by-retries', 'retries');
      }

      // Cache store
      if (!db.objectStoreNames.contains('cache')) {
        const cacheStore = db.createObjectStore('cache', {
          keyPath: 'key',
        });
        cacheStore.createIndex('by-expires', 'expiresAt');
      }
    },
  });

  return dbInstance;
}

/**
 * Get database instance
 */
export async function getDB(): Promise<IDBPDatabase<PrismaGlowDB>> {
  if (!dbInstance) {
    return initDB();
  }
  return dbInstance;
}

/**
 * Documents operations
 */
export const documents = {
  async save(doc: OfflineDocument): Promise<void> {
    const db = await getDB();
    await db.put('documents', doc);
  },

  async get(id: string): Promise<OfflineDocument | undefined> {
    const db = await getDB();
    return db.get('documents', id);
  },

  async getAll(): Promise<OfflineDocument[]> {
    const db = await getDB();
    return db.getAll('documents');
  },

  async getUnsynced(): Promise<OfflineDocument[]> {
    const db = await getDB();
    const all = await db.getAll('documents');
    return all.filter((doc) => !doc.synced);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('documents', id);
  },

  async markSynced(id: string, serverId: string): Promise<void> {
    const db = await getDB();
    const doc = await db.get('documents', id);
    if (doc) {
      doc.synced = true;
      doc.serverId = serverId;
      await db.put('documents', doc);
    }
  },
};

/**
 * Actions queue operations
 */
export const actions = {
  async enqueue(action: OfflineAction): Promise<void> {
    const db = await getDB();
    await db.put('actions', action);
  },

  async getAll(): Promise<OfflineAction[]> {
    const db = await getDB();
    return db.getAll('actions');
  },

  async getPending(): Promise<OfflineAction[]> {
    const db = await getDB();
    const now = Date.now();
    const all = await db.getAll('actions');
    return all.filter(
      (a) => !a.nextAttemptAt || a.nextAttemptAt <= now
    );
  },

  async update(action: OfflineAction): Promise<void> {
    const db = await getDB();
    await db.put('actions', action);
  },

  async remove(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('actions', id);
  },

  async clear(): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('actions', 'readwrite');
    await tx.store.clear();
    await tx.done;
  },
};

/**
 * Cache operations
 */
export const cache = {
  async set(key: string, url: string, data: unknown, ttl: number): Promise<void> {
    const db = await getDB();
    const now = Date.now();
    await db.put('cache', {
      key,
      url,
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
  },

  async get(key: string): Promise<unknown | undefined> {
    const db = await getDB();
    const entry = await db.get('cache', key);
    if (!entry) return undefined;

    if (entry.expiresAt < Date.now()) {
      await db.delete('cache', key);
      return undefined;
    }

    return entry.data;
  },

  async clearExpired(): Promise<void> {
    const db = await getDB();
    const now = Date.now();
    const tx = db.transaction('cache', 'readwrite');
    const index = tx.store.index('by-expires');
    const range = IDBKeyRange.upperBound(now);

    for await (const cursor of index.iterate(range)) {
      await cursor.delete();
    }
    await tx.done;
  },

  async clear(): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('cache', 'readwrite');
    await tx.store.clear();
    await tx.done;
  },
};

/**
 * Get storage usage estimate
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return { usage: 0, quota: 0 };
}

