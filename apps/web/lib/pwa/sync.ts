/**
 * Background sync manager for offline actions
 * Handles queuing and syncing of offline actions when connection is restored
 */

import { actions, documents, cache } from './db';
import type { OfflineAction, OfflineDocument } from './db';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 30000; // 30 seconds
const MAX_RETRY_DELAY_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
}

/**
 * Calculate next retry time with exponential backoff
 */
function calculateNextRetry(retries: number): number {
  const delay = Math.min(
    RETRY_DELAY_MS * Math.pow(2, retries),
    MAX_RETRY_DELAY_MS
  );
  return Date.now() + delay;
}

/**
 * Process a single offline action
 */
async function processAction(action: OfflineAction): Promise<boolean> {
  try {
    const response = await fetch(action.endpoint, {
      method: action.method,
      headers: {
        'Content-Type': 'application/json',
        ...action.headers,
      },
      body: action.method !== 'GET' ? JSON.stringify(action.payload) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Action succeeded, remove from queue
    await actions.remove(action.id);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const retries = action.retries + 1;

    if (retries >= MAX_RETRIES) {
      // Max retries reached, remove from queue
      await actions.remove(action.id);
      return false;
    }

    // Update action with retry info
    await actions.update({
      ...action,
      retries,
      lastError: errorMessage,
      nextAttemptAt: calculateNextRetry(retries),
    });

    return false;
  }
}

/**
 * Sync all pending offline actions
 */
export async function syncOfflineActions(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
  };

  try {
    const pending = await actions.getPending();

    for (const action of pending) {
      const success = await processAction(action);
      if (success) {
        result.processed++;
      } else {
        result.failed++;
        result.errors.push(`Action ${action.id} failed after retries`);
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push(
      error instanceof Error ? error.message : String(error)
    );
  }

  return result;
}

/**
 * Sync unsynced documents
 */
export async function syncDocuments(
  syncFn: (doc: OfflineDocument) => Promise<{ id: string }>
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
  };

  try {
    const unsynced = await documents.getUnsynced();

    for (const doc of unsynced) {
      try {
        const serverDoc = await syncFn(doc);
        await documents.markSynced(doc.id, serverDoc.id);
        result.processed++;
      } catch (error) {
        result.failed++;
        result.errors.push(
          `Document ${doc.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push(
      error instanceof Error ? error.message : String(error)
    );
  }

  return result;
}

/**
 * Queue an action for offline sync
 */
export async function queueAction(
  endpoint: string,
  method: string,
  payload: unknown,
  headers?: Record<string, string>
): Promise<string> {
  const id = crypto.randomUUID();
  const action: OfflineAction = {
    id,
    action: `${method} ${endpoint}`,
    endpoint,
    method,
    payload,
    headers,
    timestamp: Date.now(),
    retries: 0,
  };

  await actions.enqueue(action);
  return id;
}

/**
 * Clear expired cache entries
 */
export async function cleanupCache(): Promise<void> {
  await cache.clearExpired();
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<{
  pendingActions: number;
  unsyncedDocuments: number;
  cacheSize: number;
}> {
  const [pending, unsynced, allCache] = await Promise.all([
    actions.getPending(),
    documents.getUnsynced(),
    // Note: We'd need a count method for cache, using getAll as approximation
    Promise.resolve([]),
  ]);

  return {
    pendingActions: pending.length,
    unsyncedDocuments: unsynced.length,
    cacheSize: 0, // Would need proper count
  };
}

