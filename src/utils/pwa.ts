// PWA utilities for Prisma Glow

import { recordClientError, recordClientEvent } from '@/lib/client-events';
import { logger } from '@/lib/logger';
import {
  deleteIndexedDb,
  getFromIndexedDb,
  isIndexedDbAvailable,
  isQuotaExceededError,
  setInIndexedDb,
} from '@/lib/storage/indexed-db';

export const OFFLINE_QUEUE_STORAGE_KEY = 'queuedActions';
export const OFFLINE_QUEUE_UPDATED_EVENT = 'offline-queue:updated';

export interface QueuedOfflineAction {
  id: string;
  action: string;
  data: unknown;
  timestamp: number;
  retries: number;
}

async function readOfflineQueue(): Promise<QueuedOfflineAction[]> {
  if (typeof window === 'undefined' || !isIndexedDbAvailable()) {
    return [];
  }

  try {
    const stored = await getFromIndexedDb<QueuedOfflineAction[]>(OFFLINE_QUEUE_STORAGE_KEY);
    if (!stored || !Array.isArray(stored)) {
      return [];
    }

    return stored;
  } catch (error) {
    logger.error('pwa.read_offline_queue_failed', error);
    recordClientError({ name: 'pwa:readOfflineQueueFailed', error });
    return [];
  }
}

async function writeOfflineQueue(queue: QueuedOfflineAction[]): Promise<void> {
  if (typeof window === 'undefined' || !isIndexedDbAvailable()) {
    return;
  }

  try {
    await setInIndexedDb(OFFLINE_QUEUE_STORAGE_KEY, queue);
    dispatchOfflineQueueEvent(queue);
  } catch (error) {
    if (isQuotaExceededError(error)) {
      logger.error('pwa.offline_queue_quota_exceeded', error);
      recordClientError({
        name: 'pwa:offlineQueueQuotaExceeded',
        error,
        data: { queueSize: queue.length },
      });
    } else {
      logger.error('pwa.write_offline_queue_failed', error);
      recordClientError({ name: 'pwa:writeOfflineQueueFailed', error });
    }

    throw error;
  }
}

function dispatchOfflineQueueEvent(queue: QueuedOfflineAction[]) {
  if (typeof window === 'undefined') {
    return;
  }

  const event = new CustomEvent(OFFLINE_QUEUE_UPDATED_EVENT, {
    detail: { queue, updatedAt: Date.now() },
  });
  window.dispatchEvent(event);
}

declare const __ENABLE_PWA__: boolean;

const PWA_ENABLED = typeof __ENABLE_PWA__ === 'undefined' ? true : __ENABLE_PWA__;

export function registerServiceWorker() {
  if (!PWA_ENABLED || !('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker
    .register('/service-worker.js', { scope: '/' })
    .then((registration) => {
      recordClientEvent({ name: 'pwa:serviceWorkerRegistered', data: { scope: registration.scope } });

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && registration.waiting) {
            const shouldRefresh = confirm('A new version is available. Reload to update?');
            if (shouldRefresh) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            recordClientEvent({ name: 'pwa:updateAvailable', data: { accepted: shouldRefresh } });
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        recordClientEvent({ name: 'pwa:controllerChanged' });
        window.location.reload();
      });
    })
    .catch((error) => {
      logger.error('pwa.service_worker_registration_failed', error);
      recordClientError({ name: 'pwa:serviceWorkerRegistrationFailed', error });
    });
}

export function showInstallPrompt() {
  let deferredPrompt: any;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    
      recordClientEvent({ name: 'pwa:installPromptAvailable' });
  });

  return {
    showPrompt: () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === 'accepted') {
            recordClientEvent({ name: 'pwa:promptAccepted', data: { platform: deferredPrompt.platforms?.[0] } });
          } else {
            recordClientEvent({ name: 'pwa:promptDismissedByUser', data: { platform: deferredPrompt.platforms?.[0] } });
          }
          deferredPrompt = null;
        });
      }
    }
  };
}

// Enhanced background sync for offline actions
export async function queueAction(action: string, data: any) {
  if (typeof window === 'undefined') {
    return 0;
  }

  const queuedActions = await readOfflineQueue();
  const entry: QueuedOfflineAction = {
    id: crypto.randomUUID(),
    action,
    data,
    timestamp: Date.now(),
    retries: 0,
  };
  queuedActions.push(entry);
  try {
    await writeOfflineQueue(queuedActions);
  } catch (error) {
    queuedActions.pop();
    return queuedActions.length;
  }

  if ('serviceWorker' in navigator) {
    // Register for background sync (if supported)
    void navigator.serviceWorker.ready
      .then((registration) => {
        if ('sync' in registration) {
          return (registration as any).sync.register('background-sync');
        }
        recordClientEvent({ name: 'pwa:backgroundSyncUnavailable', level: 'warn' });
        return null;
      })
      .catch((err) => {
        recordClientError({ name: 'pwa:backgroundSyncError', error: err });
      });
  }

  return queuedActions.length;
}

export async function processQueuedActions() {
  if (typeof window === 'undefined') {
    return 0;
  }

  const queuedActions = await readOfflineQueue();
  const processed: string[] = [];

  // Process each queued action
  queuedActions.forEach((item) => {
    try {
      recordClientEvent({ name: 'pwa:processQueuedAction', data: { action: item.action } });

      // TODO: Implement actual processing logic here
      // This would integrate with your API calls when Supabase is connected

      // For now, just simulate success
      processed.push(item.id);
    } catch (error) {
      logger.error('pwa.process_queued_action_failed', error);
      recordClientError({ name: 'pwa:queuedActionFailed', error, data: { action: item.action } });

      // Retry logic
      if (item.retries < 3) {
        item.retries++;
      } else {
        processed.push(item.id); // Give up after 3 retries
      }
    }
  });

  // Remove processed actions
  const remaining = queuedActions.filter((item) => !processed.includes(item.id));

  try {
    await writeOfflineQueue(remaining);
  } catch (error) {
    // The write failure is already logged in writeOfflineQueue. We swallow the error to avoid
    // breaking the caller, but still ensure the queue reflects the last persisted state.
    if (!isQuotaExceededError(error)) {
      logger.error('pwa.process_queue_persist_failed', error);
    }
  }

  return processed.length;
}

export function getOfflineQueueSnapshot(): Promise<QueuedOfflineAction[]> {
  return readOfflineQueue();
}

export async function resetOfflineQueue(): Promise<void> {
  if (typeof window === 'undefined' || !isIndexedDbAvailable()) {
    return;
  }

  try {
    await writeOfflineQueue([]);
  } catch {
    await deleteIndexedDb();
  }
}

// Network status monitoring
export function setupNetworkMonitoring() {
  const updateOnlineStatus = () => {
    const status = navigator.onLine ? 'online' : 'offline';
    document.body.setAttribute('data-network-status', status);
    
    if (status === 'online') {
      // Process queued actions when back online
      void processQueuedActions();
    }
  };

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // Initial status
  updateOnlineStatus();
}

// Cache management
export function clearAppCache() {
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
      });
    });
  }
}

export function getCacheSize() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    return navigator.storage.estimate();
  }
  return Promise.resolve({ usage: 0, quota: 0 });
}
