// PWA utilities for Prisma Glow

import { callApi, type ApiRequestDescriptor } from '@/lib/apiClient';
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

const MAX_QUEUE_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

type RecordLike = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordLike =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const createQueueId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (error) {
      logger.warn('pwa.generate_queue_id_failed', error);
    }
  }

  return `queued-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normaliseRetryCount = (raw: unknown): number => {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    return Math.floor(raw);
  }

  return 0;
};

const normaliseQueuedAction = (input: unknown): QueuedOfflineAction | null => {
  if (!isRecord(input)) {
    return null;
  }

  const action = typeof input.action === 'string' ? input.action : undefined;
  if (!action) {
    return null;
  }

  const id =
    typeof input.id === 'string' && input.id.length > 0 ? input.id : createQueueId();

  const timestampRaw = (input as RecordLike).timestamp;
  const timestamp =
    typeof timestampRaw === 'number' && Number.isFinite(timestampRaw)
      ? timestampRaw
      : Date.now();

  let data: unknown;
  if ('data' in input) {
    data = (input as RecordLike).data;
  } else if ('payload' in input) {
    data = (input as RecordLike).payload;
  } else {
    const { id: _id, action: _action, timestamp: _timestamp, retries: _retries, ...rest } =
      input as RecordLike;
    data = Object.keys(rest).length > 0 ? rest : undefined;
  }

  return {
    id,
    action,
    data,
    timestamp,
    retries: normaliseRetryCount((input as RecordLike).retries),
  };
};

function readOfflineQueue(): QueuedOfflineAction[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const normalised = parsed
      .map((item) => normaliseQueuedAction(item))
      .filter((item): item is QueuedOfflineAction => item !== null);

    return normalised;
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

const normaliseHeaders = (raw?: unknown): Record<string, string> | undefined => {
  if (!isRecord(raw)) {
    return undefined;
  }

  return Object.entries(raw).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === 'string') {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const normaliseQuery = (raw?: unknown): ApiRequestDescriptor['query'] => {
  if (!isRecord(raw)) {
    return undefined;
  }

  const entries = Object.entries(raw).reduce<NonNullable<ApiRequestDescriptor['query']>>(
    (acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value as any;
      }
      return acc;
    },
    {},
  );

  return Object.keys(entries).length ? entries : undefined;
};

const parseActionDescriptor = (item: QueuedOfflineAction): ApiRequestDescriptor | null => {
  const { action, data } = item;

  let path: string | undefined;
  let method: string | undefined;
  let body: unknown;
  let headers: Record<string, string> | undefined;
  let query: ApiRequestDescriptor['query'];

  if (isRecord(data)) {
    if (typeof data.path === 'string') {
      path = data.path;
    } else if (typeof data.url === 'string') {
      path = data.url;
    }

    if (typeof data.method === 'string') {
      method = data.method.toUpperCase();
    }

    if ('body' in data) {
      body = (data as RecordLike).body;
    } else if ('payload' in data) {
      body = (data as RecordLike).payload;
    }

    headers = normaliseHeaders((data as RecordLike).headers);
    query = normaliseQuery((data as RecordLike).query);
  }

  if (!path) {
    const directMatch = /^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)[:\s]+(.+)$/i.exec(action);
    if (directMatch) {
      method = directMatch[1].toUpperCase();
      path = directMatch[2];
    } else if (action.startsWith('/')) {
      path = action;
    }
  }

  if (!path) {
    return null;
  }

  if (!body && isRecord(data)) {
    const { path: _path, url: _url, method: _method, headers: _headers, query: _query, ...rest } = data;
    if (Object.keys(rest).length > 0) {
      body = rest;
    }
  }

  if (!method) {
    method = 'POST';
  }

  return { path, method, body, headers, query };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const executeQueuedApiAction = async (item: QueuedOfflineAction) => {
  item.retries = normaliseRetryCount(item.retries);

  if (item.retries >= MAX_QUEUE_RETRIES) {
    throw new Error('max_retries_reached');
  }

  const descriptor = parseActionDescriptor(item);
  if (!descriptor) {
    throw new Error('invalid_offline_action');
  }

  while (item.retries < MAX_QUEUE_RETRIES) {
    try {
      await callApi(descriptor);
      return;
    } catch (error) {
      item.retries += 1;
      if (item.retries >= MAX_QUEUE_RETRIES) {
        throw error instanceof Error ? error : new Error(String(error));
      }

      const backoff = RETRY_BASE_DELAY_MS * Math.pow(2, item.retries - 1);
      await sleep(backoff);
    }
  }
};

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
    id: createQueueId(),
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

export async function processQueuedActions(): Promise<number> {
  if (typeof window === 'undefined') {
    return 0;
  }

  const queuedActions = await readOfflineQueue();
  const processed: string[] = [];

  for (const item of queuedActions) {
    recordClientEvent({ name: 'pwa:processQueuedAction', data: { action: item.action } });

    try {
      await executeQueuedApiAction(item);
      recordClientEvent({
        name: 'pwa:queuedActionProcessed',
        data: { action: item.action, retries: item.retries },
      });
      processed.push(item.id);
    } catch (error) {
      logger.error('pwa.process_queued_action_failed', error);
      recordClientError({ name: 'pwa:queuedActionFailed', error, data: { action: item.action } });

      if (
        item.retries >= MAX_QUEUE_RETRIES ||
        (error instanceof Error && error.message === 'invalid_offline_action')
      ) {
        processed.push(item.id);
      }
    }
  }

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
      processQueuedActions().catch((error) => {
        logger.error('pwa.process_queue_on_reconnect_failed', error);
        recordClientError({ name: 'pwa:processQueueOnReconnectFailed', error });
      });
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
