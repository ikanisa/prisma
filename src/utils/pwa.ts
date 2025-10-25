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
const BACKGROUND_SYNC_TAG = 'background-sync';
const CLIENT_RETRY_BASE_DELAY_MS = 30 * 1000;
const CLIENT_MAX_RETRY_BACKOFF_MS = 12 * 60 * 60 * 1000;

export interface QueuedOfflineAction {
  id: string;
  action: string;
  data: unknown;
  timestamp: number;
  retries: number;
  endpoint: string | null;
  method: string | null;
  headers: Record<string, string> | null;
  lastError?: string | null;
  nextAttemptAt?: number | null;
}

export interface QueueOfflineActionOptions {
  id?: string;
  endpoint?: string | null;
  method?: string | null;
  headers?: Record<string, string> | null;
  delayUntil?: number | null;
}

export interface ProcessQueueResult {
  processed: number;
  failed: number;
  remaining: number;
}

const DEFAULT_QUEUE_RESULT: ProcessQueueResult = { processed: 0, failed: 0, remaining: 0 };

const LOCAL_MAX_JOB_RETRIES = 3;

function generateQueueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `offline-job-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeHeaders(headers: Record<string, string> | null | undefined): Record<string, string> | null {
  if (!headers || typeof headers !== 'object') {
    return null;
  }

  const normalizedEntries = Object.entries(headers).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === 'string' && key) {
      acc[key] = value;
    }
    return acc;
  }, {});

  return Object.keys(normalizedEntries).length > 0 ? normalizedEntries : null;
}

function normalizeQueuedAction(job: Partial<QueuedOfflineAction>): QueuedOfflineAction {
  const endpoint = typeof job.endpoint === 'string' && job.endpoint.length > 0 ? job.endpoint : null;
  let method = typeof job.method === 'string' && job.method.length > 0 ? job.method.toUpperCase() : null;
  if (!method && endpoint) {
    method = 'POST';
  }

  return {
    id: typeof job.id === 'string' && job.id.length > 0 ? job.id : generateQueueId(),
    action: typeof job.action === 'string' && job.action.length > 0 ? job.action : 'unknown',
    data: job.data,
    timestamp: typeof job.timestamp === 'number' && Number.isFinite(job.timestamp) ? job.timestamp : Date.now(),
    retries: typeof job.retries === 'number' && Number.isFinite(job.retries) ? job.retries : 0,
    endpoint,
    method,
    headers: normalizeHeaders(job.headers),
    lastError: typeof job.lastError === 'string' ? job.lastError : null,
    nextAttemptAt: typeof job.nextAttemptAt === 'number' && Number.isFinite(job.nextAttemptAt)
      ? job.nextAttemptAt
      : null,
  } satisfies QueuedOfflineAction;
}

function computeClientNextAttempt(retries: number): number {
  const delay = Math.min(
    CLIENT_RETRY_BASE_DELAY_MS * 2 ** Math.max(0, retries - 1),
    CLIENT_MAX_RETRY_BACKOFF_MS,
  );
  return Date.now() + delay;
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

async function readOfflineQueue(): Promise<QueuedOfflineAction[]> {
  if (typeof window === 'undefined') {
    return [];
  }

  const readFromLocalStorage = () => {
    try {
      const raw = window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map((entry) => normalizeQueuedAction(entry as Partial<QueuedOfflineAction>));
    } catch {
      return [];
    }
  };

  try {
    if (!isIndexedDbAvailable()) {
      return readFromLocalStorage();
    }

    const stored = await getFromIndexedDb<unknown>(OFFLINE_QUEUE_STORAGE_KEY);
    if (!stored) {
      return readFromLocalStorage();
    }

    if (Array.isArray(stored)) {
      return stored.map((entry) => normalizeQueuedAction(entry as Partial<QueuedOfflineAction>));
    }

    if (typeof stored === 'string') {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => normalizeQueuedAction(entry as Partial<QueuedOfflineAction>));
      }
    }

    if (Array.isArray((stored as any)?.jobs)) {
      return (stored as any).jobs.map((entry: Partial<QueuedOfflineAction>) => normalizeQueuedAction(entry));
    }

    return [];
  } catch (error) {
    logger.error('pwa.read_offline_queue_failed', error);
    recordClientError({ name: 'pwa:readOfflineQueueFailed', error });
    return readFromLocalStorage();
  }
}

async function writeOfflineQueue(queue: QueuedOfflineAction[]): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const normalized = queue.map((entry) => normalizeQueuedAction(entry));

  if (!isIndexedDbAvailable()) {
    window.localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(normalized));
    dispatchOfflineQueueEvent(normalized);
    return;
  }

  await setInIndexedDb(OFFLINE_QUEUE_STORAGE_KEY, normalized);
  try {
    window.localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // LocalStorage mirroring is best-effort only.
  }
  dispatchOfflineQueueEvent(normalized);
}

async function postMessageToServiceWorker(message: unknown) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const worker = registration.active ?? navigator.serviceWorker.controller;
    if (worker) {
      worker.postMessage(message);
    }
  } catch (error) {
    logger.warn('pwa.service_worker_message_failed', error);
  }
}

async function removeOfflineQueueEntry(id: string) {
  try {
    const queue = await readOfflineQueue();
    const nextQueue = queue.filter((item) => item.id !== id);
    if (nextQueue.length !== queue.length) {
      await writeOfflineQueue(nextQueue);
    }
  } catch (error) {
    logger.warn('pwa.remove_offline_queue_entry_failed', error);
  }
}

async function requestOfflineQueueSnapshot() {
  if (typeof window === 'undefined') {
    return;
  }

  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const worker = registration.active ?? navigator.serviceWorker.controller;
    if (!worker) {
      return;
    }

    await new Promise<void>((resolve) => {
      const channel = new MessageChannel();
      const timeout = window.setTimeout(() => {
        channel.port1.close();
        resolve();
      }, 2000);

      channel.port1.onmessage = async (event) => {
        window.clearTimeout(timeout);
        channel.port1.close();
        const { data } = event;
        if (data && typeof data === 'object' && data.type === 'OFFLINE_QUEUE_SNAPSHOT') {
          const jobs = Array.isArray(data.payload?.jobs)
            ? (data.payload.jobs as Array<Partial<QueuedOfflineAction>>)
            : [];
          try {
            await writeOfflineQueue(jobs.map((job) => normalizeQueuedAction(job)));
          } catch (error) {
            logger.warn('pwa.offline_queue_snapshot_write_failed', error);
          }
        }
        resolve();
      };

      worker.postMessage({ type: 'OFFLINE_QUEUE_REQUEST_SNAPSHOT' }, [channel.port2]);
    });
  } catch (error) {
    logger.warn('pwa.offline_queue_snapshot_failed', error);
  }
}

let serviceWorkerListenerRegistered = false;

async function handleServiceWorkerMessage(event: MessageEvent) {
  const { data } = event;
  if (!data || typeof data !== 'object') {
    return;
  }

  if (data.type === 'OFFLINE_QUEUE_JOB_COMPLETED') {
    const id = data.payload?.id as string | undefined;
    if (id) {
      void removeOfflineQueueEntry(id);
    }
    return;
  }

  if (data.type === 'OFFLINE_QUEUE_JOB_FAILED') {
    const payload = data.payload ?? {};
    const id = payload.id as string | undefined;
    if (!id) {
      return;
    }
    if (payload.final === true) {
      removeOfflineQueueEntry(id);
      return;
    }
    try {
      const queue = await readOfflineQueue();
      const nextQueue = queue.map((item) => {
        if (item.id !== id) return item;
        const retries = typeof payload.retries === 'number' ? payload.retries : item.retries + 1;
        const nextAttemptAt =
          typeof payload.nextAttemptAt === 'number' && Number.isFinite(payload.nextAttemptAt)
            ? payload.nextAttemptAt
            : computeClientNextAttempt(retries);
        return normalizeQueuedAction({
          ...item,
          retries,
          lastError: typeof payload.error === 'string' ? payload.error : item.lastError ?? null,
          nextAttemptAt,
        });
      });
      await writeOfflineQueue(nextQueue);
    } catch (error) {
      logger.warn('pwa.offline_queue_update_failed', error);
    }
  }
}

function ensureServiceWorkerListeners() {
  if (serviceWorkerListenerRegistered) {
    return;
  }
  if (typeof window === 'undefined') {
    return;
  }
  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
  serviceWorkerListenerRegistered = true;
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

  ensureServiceWorkerListeners();

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
        void requestOfflineQueueSnapshot();
        window.location.reload();
      });

      void requestOfflineQueueSnapshot();
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
export async function queueAction(
  action: string,
  data: unknown,
  options: QueueOfflineActionOptions = {},
): Promise<QueuedOfflineAction> {
  if (typeof window === 'undefined') {
    return normalizeQueuedAction({ action, data });
  }

  const queuedActions = await readOfflineQueue();
  const entry = normalizeQueuedAction({
    id: options.id,
    action,
    data,
    timestamp: Date.now(),
    retries: 0,
    endpoint: options.endpoint ?? null,
    method: options.method ?? null,
    headers: options.headers ?? null,
    lastError: null,
    nextAttemptAt: options.delayUntil ?? null,
  });

  queuedActions.push(entry);
  try {
    await writeOfflineQueue(queuedActions);
  } catch (error) {
    queuedActions.pop();
    if (isQuotaExceededError(error)) {
      logger.error('pwa.offline_queue_quota_exceeded', error);
      recordClientError({ name: 'pwa:offlineQueueQuotaExceeded', error });
    } else {
      logger.error('pwa.offline_queue_write_failed', error);
      recordClientError({ name: 'pwa:offlineQueueWriteFailed', error });
    }
    throw error;
  }

  void postMessageToServiceWorker({ type: 'OFFLINE_QUEUE_ENQUEUE', payload: entry });

  if ('serviceWorker' in navigator) {
    // Register for background sync (if supported)
    void navigator.serviceWorker.ready
      .then((registration) => {
        if ('sync' in registration) {
          const syncManager = (registration as ServiceWorkerRegistration & {
            sync?: { register: (tag: string) => Promise<void> };
          }).sync;
          return syncManager?.register(BACKGROUND_SYNC_TAG);
        }
        recordClientEvent({ name: 'pwa:backgroundSyncUnavailable', level: 'warn' });
        return null;
      })
      .catch((err) => {
        recordClientError({ name: 'pwa:backgroundSyncError', error: err });
      });
  }

  return entry;
}

async function processQueuedActionsWithServiceWorker(): Promise<ProcessQueueResult> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return DEFAULT_QUEUE_RESULT;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const worker = registration.active ?? navigator.serviceWorker.controller;
    if (!worker) {
      return DEFAULT_QUEUE_RESULT;
    }

    const readRemaining = async (): Promise<number> => {
      try {
        const queue = await readOfflineQueue();
        return queue.length;
      } catch {
        return 0;
      }
    };

    return await new Promise<ProcessQueueResult>((resolve) => {
      const channel = new MessageChannel();
      const timeout = window.setTimeout(() => {
        channel.port1.close();
        void readRemaining().then((remaining) => {
          resolve({ ...DEFAULT_QUEUE_RESULT, remaining });
        });
      }, 4000);

      channel.port1.onmessage = (event) => {
        window.clearTimeout(timeout);
        channel.port1.close();
        const message = event.data;
        if (message && typeof message === 'object' && message.type === 'OFFLINE_QUEUE_PROCESS_RESULT') {
          const payload = message.payload as Partial<ProcessQueueResult> | undefined;
          const processed = typeof payload?.processed === 'number' ? payload.processed : 0;
          const failed = typeof payload?.failed === 'number' ? payload.failed : 0;
          if (typeof payload?.remaining === 'number') {
            resolve({ processed, failed, remaining: payload.remaining });
            return;
          }
          void readRemaining().then((remaining) => resolve({ processed, failed, remaining }));
          return;
        }

        void readRemaining().then((remaining) => {
          resolve({ ...DEFAULT_QUEUE_RESULT, remaining });
        });
      };

      try {
        worker.postMessage({ type: 'OFFLINE_QUEUE_PROCESS_NOW' }, [channel.port2]);
      } catch (error) {
        window.clearTimeout(timeout);
        channel.port1.close();
        recordClientError({ name: 'pwa:processQueuePostMessageFailed', error });
        void readRemaining().then((remaining) => {
          resolve({ ...DEFAULT_QUEUE_RESULT, remaining });
        });
      }
    });
  } catch (error) {
    logger.warn('pwa.process_queue_sw_failed', error);
    recordClientError({ name: 'pwa:processQueueServiceWorkerFailed', error });
    return DEFAULT_QUEUE_RESULT;
  }
}

async function processQueuedActionsLocally(): Promise<ProcessQueueResult> {
  if (typeof window === 'undefined') {
    return DEFAULT_QUEUE_RESULT;
  }

  const queuedActions = await readOfflineQueue();
  if (queuedActions.length === 0) {
    return { ...DEFAULT_QUEUE_RESULT, remaining: 0 };
  }

  let processed = 0;
  let failed = 0;
  const nextQueue: QueuedOfflineAction[] = [];

  for (const item of queuedActions) {
    try {
      recordClientEvent({ name: 'pwa:processQueuedAction', data: { action: item.action } });

      if (!item.endpoint) {
        await executeQueuedApiAction(item);
        processed += 1;
        continue;
      }

      const method = item.method ?? 'POST';
      const headers = new Headers(item.headers ?? {});
      if (method !== 'GET' && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(item.endpoint, {
        method,
        headers,
        body: method === 'GET' ? undefined : JSON.stringify({ id: item.id, action: item.action, data: item.data }),
        credentials: 'include',
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error(`request_failed_${response.status}`);
      }

      processed += 1;
    } catch (error) {
      failed += 1;
      logger.error('pwa.process_queued_action_failed', error);
      recordClientError({ name: 'pwa:queuedActionFailed', error, data: { action: item.action } });

      const retries = item.retries + 1;
      if (retries < LOCAL_MAX_JOB_RETRIES) {
        const updated = normalizeQueuedAction({
          ...item,
          retries,
          lastError: error instanceof Error ? error.message : String(error),
          nextAttemptAt: computeClientNextAttempt(retries),
        });
        nextQueue.push(updated);
        continue;
      }

      void postMessageToServiceWorker({ type: 'OFFLINE_QUEUE_REMOVE', payload: { id: item.id } });
    }
  }

  await writeOfflineQueue(nextQueue);

  return { processed, failed, remaining: nextQueue.length };
}

export async function processQueuedActions(): Promise<ProcessQueueResult> {
  if (typeof window === 'undefined') {
    return DEFAULT_QUEUE_RESULT;
  }

  const useServiceWorker = 'serviceWorker' in navigator;
  const result = useServiceWorker
    ? await processQueuedActionsWithServiceWorker()
    : await processQueuedActionsLocally();

  if (useServiceWorker) {
    void requestOfflineQueueSnapshot();
  }

  return result;
}

export function getOfflineQueueSnapshot(): Promise<QueuedOfflineAction[]> {
  return readOfflineQueue();
}

export async function resetOfflineQueue(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (!isIndexedDbAvailable()) {
      window.localStorage.removeItem(OFFLINE_QUEUE_STORAGE_KEY);
      dispatchOfflineQueueEvent([]);
      return;
    }
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
      void processQueuedActions().catch((error) => {
        logger.error('pwa.process_queue_on_reconnect_failed', error);
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
