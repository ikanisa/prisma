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

async function readOfflineQueue(): Promise<QueuedOfflineAction[]> {
  if (typeof window === 'undefined' || !isIndexedDbAvailable()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => normalizeQueuedAction(entry as Partial<QueuedOfflineAction>));
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

  const normalized = queue.map((entry) => normalizeQueuedAction(entry));
  window.localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(normalized));
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

function removeOfflineQueueEntry(id: string) {
  const queue = readOfflineQueue();
  const nextQueue = queue.filter((item) => item.id !== id);
  if (nextQueue.length !== queue.length) {
    writeOfflineQueue(nextQueue);
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

      channel.port1.onmessage = (event) => {
        window.clearTimeout(timeout);
        const { data } = event;
        if (data && typeof data === 'object' && data.type === 'OFFLINE_QUEUE_SNAPSHOT') {
          const jobs = Array.isArray(data.payload?.jobs)
            ? (data.payload.jobs as Array<Partial<QueuedOfflineAction>>)
            : [];
          writeOfflineQueue(jobs.map((job) => normalizeQueuedAction(job)));
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

function handleServiceWorkerMessage(event: MessageEvent) {
  const { data } = event;
  if (!data || typeof data !== 'object') {
    return;
  }

  if (data.type === 'OFFLINE_QUEUE_JOB_COMPLETED') {
    const id = data.payload?.id as string | undefined;
    if (id) {
      removeOfflineQueueEntry(id);
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
    const queue = readOfflineQueue();
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
    writeOfflineQueue(nextQueue);
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
export function queueAction(
  action: string,
  data: unknown,
  options: QueueOfflineActionOptions = {},
): QueuedOfflineAction {
  if (typeof window === 'undefined') {
    return normalizeQueuedAction({ action, data });
  }

  const queuedActions = readOfflineQueue();
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
    return queuedActions.length;
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

    return await new Promise<ProcessQueueResult>((resolve) => {
      const channel = new MessageChannel();
      const timeout = window.setTimeout(() => {
        channel.port1.close();
        resolve({ ...DEFAULT_QUEUE_RESULT, remaining: readOfflineQueue().length });
      }, 4000);

      channel.port1.onmessage = (event) => {
        window.clearTimeout(timeout);
        channel.port1.close();
        const message = event.data;
        if (message && typeof message === 'object' && message.type === 'OFFLINE_QUEUE_PROCESS_RESULT') {
          const payload = message.payload as Partial<ProcessQueueResult> | undefined;
          resolve({
            processed: typeof payload?.processed === 'number' ? payload.processed : 0,
            failed: typeof payload?.failed === 'number' ? payload.failed : 0,
            remaining: typeof payload?.remaining === 'number' ? payload.remaining : readOfflineQueue().length,
          });
          return;
        }

        resolve({ ...DEFAULT_QUEUE_RESULT, remaining: readOfflineQueue().length });
      };

      try {
        worker.postMessage({ type: 'OFFLINE_QUEUE_PROCESS_NOW' }, [channel.port2]);
      } catch (error) {
        window.clearTimeout(timeout);
        channel.port1.close();
        recordClientError({ name: 'pwa:processQueuePostMessageFailed', error });
        resolve({ ...DEFAULT_QUEUE_RESULT, remaining: readOfflineQueue().length });
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

  const queuedActions = readOfflineQueue();
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
        throw new Error('missing_endpoint');
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

  writeOfflineQueue(nextQueue);

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
